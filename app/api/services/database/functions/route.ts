import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import sql from "mssql";
import { getDbPool } from "@/lib/db";

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
    permissions?: string[]; // 添加权限数组
  };
}

// 检查用户是否有访问数据库的权限
function hasAccessDatabasePermission(session: ExtendedSession): boolean {
  if (!session?.user?.permissions) return false;
  return session.user.permissions.includes('access_database');
}

export async function GET(request: Request) {
  // 获取查询参数
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const prefix = searchParams.get("prefix") || "";
  // 添加搜索参数和不区分大小写选项
  const searchTerm = searchParams.get("search") || "";
  // 强制启用不区分大小写
  const ignoreCase = true; // 强制为true，不再依赖URL参数
  
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

    // 检查用户是否有访问数据库的权限
    if (!hasAccessDatabasePermission(session)) {
      console.log("用户无权访问数据库函数API:", session.user.id, "权限:", session.user.permissions);
      return NextResponse.json(
        { error: "无权访问数据库", requiredPermission: "access_database" },
        { status: 403 }
      );
    }

    // 使用getDbPool获取数据库连接池
    pool = await getDbPool();
    
    // 构建LIKE查询条件
    let whereClause = "(o.type = 'FN' OR o.type = 'IF' OR o.type = 'TF') AND o.is_ms_shipped = 0";
    let searchValue = "";
    
    if (searchTerm) {
      // 使用搜索词进行模糊匹配 - 总是小写
      searchValue = `%${searchTerm.toLowerCase()}%`;
      
      // 始终使用不区分大小写的查询
      whereClause += " AND (LOWER(o.name) LIKE @search OR o.name COLLATE SQL_Latin1_General_CP1_CI_AS LIKE @search)";
    } else if (prefix) {
      // 兼容旧的prefix参数
      searchValue = `${prefix}%`;
      whereClause += " AND o.name LIKE @search";
    }

    // 打印SQL语句和参数
    console.log("函数搜索条件:", { searchTerm, ignoreCase, searchValue });
    const countSql = `SELECT COUNT(*) AS total FROM sys.objects o WHERE ${whereClause}`;
    console.log("函数统计SQL:", countSql);

    // 首先获取符合条件的总函数数量
    const countResult = await pool.request()
      .input('search', sql.NVarChar, searchValue)
      .query(`
        SELECT COUNT(*) AS total
        FROM sys.objects o
        WHERE ${whereClause}
      `);
    
    const total = countResult.recordset[0].total;
    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;

    // 分页查询所有函数，不包含定义内容以提高加载速度
    const functionsResult = await pool.request()
      .input('search', sql.NVarChar, searchValue)
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
          ${whereClause}
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