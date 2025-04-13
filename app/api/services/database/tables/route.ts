import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import sql from "mssql";
import { getDbPool } from "@/lib/db";

// 列信息接口
interface ColumnInfo {
  columnName: string;
  dataType: string;
  columnLength: number;
  numericPrecision?: number;
  decimalPlaces: number | null;
  isNullable: boolean;
  isPrimaryKey: number;
  defaultValue: string;
  description: string;
}

// 扩展会话接口
interface ExtendedSession {
  user?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
  };
}

export async function GET(request: Request) {
  // 获取查询参数
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const prefix = searchParams.get("prefix") || "";
  const includeColumns = searchParams.get("includeColumns") === "true";
  // 添加搜索参数和不区分大小写选项 - 修复ignoreCase参数解析
  const searchTerm = searchParams.get("search") || "";
  // 强制启用不区分大小写，或者检查参数值
  const ignoreCase = true; // 强制为true，不再依赖URL参数
  
  console.log("实际接收到的参数:", searchParams.toString());
  
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

    // 使用getDbPool获取数据库连接池
    pool = await getDbPool();

    // 构建LIKE查询条件
    let whereClause = "t.is_ms_shipped = 0";
    let searchValue = "";
    
    if (searchTerm) {
      // 使用搜索词进行模糊匹配 - 总是小写
      searchValue = `%${searchTerm.toLowerCase()}%`; 
      
      // 始终使用不区分大小写的查询
      whereClause += " AND (LOWER(t.name) LIKE @search OR t.name COLLATE SQL_Latin1_General_CP1_CI_AS LIKE @search)";
    } else if (prefix) {
      // 兼容旧的prefix参数
      searchValue = `${prefix}%`;
      whereClause += " AND t.name LIKE @search";
    }

    // 打印SQL语句和参数
    console.log("搜索条件:", { searchTerm, ignoreCase, searchValue });
    const countSql = `SELECT COUNT(*) as total FROM sys.tables t WHERE ${whereClause}`;
    console.log("统计SQL:", countSql);
    
    // 另外进行一次直接测试查询，确认SQL执行结果
    if (searchTerm) {
      const testSql = `SELECT name FROM sys.tables WHERE type='U' and LOWER(name) like '%${searchTerm.toLowerCase()}%'`;
      console.log("测试SQL:", testSql);
      try {
        const testResult = await pool.request().query(testSql);
        console.log("测试SQL结果:", testResult.recordset);
      } catch (err) {
        console.error("测试SQL错误:", err);
      }
    }

    // 查询表总数
    const countResult = await pool.request()
      .input('search', sql.NVarChar, searchValue)
      .query(`
        SELECT COUNT(*) as total
        FROM sys.tables t
        WHERE ${whereClause}
      `);
    
    const total = countResult.recordset[0].total;

    // 打印查询SQL
    const querySql = `SELECT t.name AS name FROM sys.tables t WHERE ${whereClause} ORDER BY t.name OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;
    console.log("查询SQL:", querySql);

    // 使用分页查询表
    const tablesResult = await pool.request()
      .input('search', sql.NVarChar, searchValue)
      .input('offset', sql.Int, (page - 1) * pageSize)
      .input('pageSize', sql.Int, pageSize)
      .query(`
        SELECT 
          t.name AS name
        FROM 
          sys.tables t
        WHERE 
          ${whereClause}
        ORDER BY 
          t.name
        OFFSET @offset ROWS
        FETCH NEXT @pageSize ROWS ONLY
      `);

    const tables = tablesResult.recordset;
    const result = [];

    // 只查询列信息（如果请求了完整信息）
    if (includeColumns) {
      // 查询每个表的列信息
      for (const table of tables) {
        const columnsResult = await pool.request()
          .input('tableName', sql.NVarChar, table.name)
          .query(`
            SELECT 
              c.name AS columnName,
              t.name AS dataType,
              c.max_length AS columnLength,
              c.precision AS numericPrecision,
              c.scale AS decimalPlaces,
              c.is_nullable AS isNullable,
              CASE WHEN pk.column_id IS NOT NULL THEN 1 ELSE 0 END AS isPrimaryKey,
              CAST(ISNULL(dc.definition, '') AS NVARCHAR(MAX)) AS defaultValue,
              CAST(ISNULL(ep.value, '') AS NVARCHAR(MAX)) AS description
            FROM 
              sys.columns c
            JOIN 
              sys.types t ON c.user_type_id = t.user_type_id
            LEFT JOIN 
              (SELECT ic.column_id, ic.object_id
              FROM sys.indexes i
              JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
              WHERE i.is_primary_key = 1) AS pk ON c.column_id = pk.column_id AND c.object_id = pk.object_id
            LEFT JOIN 
              sys.default_constraints dc ON c.default_object_id = dc.object_id
            LEFT JOIN 
              sys.extended_properties ep ON ep.major_id = c.object_id AND ep.minor_id = c.column_id AND ep.name = 'MS_Description'
            WHERE 
              c.object_id = OBJECT_ID(@tableName)
            ORDER BY 
              c.column_id
          `);

        // 映射列数据
        const columns = columnsResult.recordset.map((column: ColumnInfo) => {
          // 字符串类型的长度计算
          let displayLength: number | string = column.columnLength;
          if (column.dataType === 'nvarchar' || column.dataType === 'varchar') {
            if (column.columnLength === -1) {
              displayLength = 'MAX';
            } else if (column.dataType.startsWith('n')) {
              displayLength = column.columnLength / 2; // Unicode字符类型长度需要除以2
            }
          }
          
          return {
            columnName: column.columnName,
            dataType: column.dataType,
            columnLength: displayLength,
            decimalPlaces: column.decimalPlaces,
            isNullable: column.isNullable === true,
            isPrimaryKey: column.isPrimaryKey === 1,
            defaultValue: column.defaultValue,
            description: column.description
          };
        });

        result.push({
          name: table.name,
          columns: columns,
          type: "table"
        });
      }
    } else {
      // 只返回表名列表，不包含列信息
      for (const table of tables) {
        result.push({
          name: table.name,
          columns: [],
          type: "table"
        });
      }
    }

    return NextResponse.json({
      tables: result,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error("获取表结构失败:", error);
    return NextResponse.json(
      { error: "获取表结构失败", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    );
  } finally {
    // 关闭数据库连接池
    if (pool) {
      await pool.close();
    }
  }
} 