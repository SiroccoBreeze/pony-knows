import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import sql from "mssql";

// 数据库配置
const sqlConfig = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  database: process.env.MSSQL_DATABASE,
  server: process.env.MSSQL_SERVER || "localhost",
  port: parseInt(process.env.MSSQL_PORT || "1433"),
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

// 函数信息接口
interface BasicFunctionInfo {
  name: string;
  createDate: string;
  modifyDate: string;
}

// 扩展 Session 类型
interface ExtendedSession {
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export async function GET(request: Request) {
  // 获取查询参数
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const prefix = searchParams.get("prefix") || "";
  
  let pool: sql.ConnectionPool | undefined;
  
  try {
    // 获取用户会话
    const session = await getServerSession(authOptions) as ExtendedSession;
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    // 创建数据库连接池
    pool = await new sql.ConnectionPool(sqlConfig).connect();

    // 首先获取符合条件的总函数数量
    const countResult = await pool.request()
      .input('prefix', sql.NVarChar, prefix + '%')
      .query(`
        SELECT COUNT(*) AS total
        FROM sys.objects o
        WHERE (o.type = 'FN' OR o.type = 'IF' OR o.type = 'TF')
        AND o.is_ms_shipped = 0
        AND o.name LIKE @prefix
      `);
    
    const total = countResult.recordset[0].total;
    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;

    // 分页查询所有函数，不包含定义内容以提高加载速度
    const functionsResult = await pool.request()
      .input('prefix', sql.NVarChar, prefix + '%')
      .input('offset', sql.Int, offset)
      .input('pageSize', sql.Int, pageSize)
      .query(`
        SELECT 
          o.name,
          o.create_date AS createDate,
          o.modify_date AS modifyDate
        FROM 
          sys.objects o
        WHERE 
          (o.type = 'FN' OR o.type = 'IF' OR o.type = 'TF')
          AND o.is_ms_shipped = 0
          AND o.name LIKE @prefix
        ORDER BY 
          o.name
        OFFSET @offset ROWS
        FETCH NEXT @pageSize ROWS ONLY
      `);

    const functions = functionsResult.recordset.map((func: BasicFunctionInfo) => ({
      name: func.name,
      definition: "", // 不返回定义内容，留空
      createDate: func.createDate,
      modifyDate: func.modifyDate,
      type: "function"
    }));

    return NextResponse.json({
      functions: functions,
      pagination: {
        total,
        page,
        pageSize,
        totalPages
      }
    });
  } catch (error) {
    console.error("获取函数失败:", error);
    return NextResponse.json(
      { error: "获取函数失败", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    );
  } finally {
    // 关闭数据库连接池
    if (pool) {
      await pool.close();
    }
  }
} 