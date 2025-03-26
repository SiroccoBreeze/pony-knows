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

// 存储过程信息接口
interface ProcedureInfo {
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
    // 获取用户会话，可以检查权限
    const session = await getServerSession(authOptions) as ExtendedSession;
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    // 创建数据库连接池
    pool = await new sql.ConnectionPool(sqlConfig).connect();

    // 首先获取符合条件的总存储过程数量
    const countResult = await pool.request()
      .input('prefix', sql.NVarChar, prefix + '%')
      .query(`
        SELECT COUNT(*) AS total
        FROM sys.procedures p
        WHERE p.is_ms_shipped = 0
        AND p.name LIKE @prefix
      `);
    
    const total = countResult.recordset[0].total;
    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;

    // 分页查询存储过程，不包含定义内容以提高加载速度
    const proceduresResult = await pool.request()
      .input('prefix', sql.NVarChar, prefix + '%')
      .input('offset', sql.Int, offset)
      .input('pageSize', sql.Int, pageSize)
      .query(`
        SELECT 
          p.name,
          p.create_date AS createDate,
          p.modify_date AS modifyDate
        FROM 
          sys.procedures p
        WHERE 
          p.is_ms_shipped = 0
          AND p.name LIKE @prefix
        ORDER BY 
          p.name
        OFFSET @offset ROWS
        FETCH NEXT @pageSize ROWS ONLY
      `);

    const procedures = proceduresResult.recordset.map((proc: ProcedureInfo) => ({
      name: proc.name,
      definition: "", // 不返回定义内容，留空
      createDate: proc.createDate,
      modifyDate: proc.modifyDate,
      type: "procedure"
    }));

    return NextResponse.json({
      procedures: procedures,
      pagination: {
        total,
        page,
        pageSize,
        totalPages
      }
    });
  } catch (error) {
    console.error("获取存储过程失败:", error);
    return NextResponse.json(
      { error: "获取存储过程失败", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    );
  } finally {
    // 关闭数据库连接池
    if (pool) {
      await pool.close();
    }
  }
} 