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
    encrypt: true, // 如果使用Azure，设为true
    trustServerCertificate: true // 如果是本地开发环境，设为true
  }
};

// 扩展 Session 类型
interface ExtendedSession {
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

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

// 表信息接口
interface TableInfo {
  tableName: string;
}

export async function GET() {
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

    // 查询所有用户表
    const tablesResult = await pool.request().query(`
      SELECT 
        t.name AS tableName
      FROM 
        sys.tables t
      WHERE 
        t.is_ms_shipped = 0
      ORDER BY 
        t.name
    `);

    const tables = tablesResult.recordset as TableInfo[];
    const result = [];

    // 查询每个表的列信息
    for (const table of tables) {
      const columnsResult = await pool.request().input('tableName', sql.NVarChar, table.tableName).query(`
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
        tableName: table.tableName,
        columns: columns
      });
    }

    return NextResponse.json({
      tables: result
    });
  } catch (error) {
    console.error("获取数据库表结构失败:", error);
    return NextResponse.json(
      { error: "获取数据库表结构失败", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    );
  } finally {
    // 关闭数据库连接池
    if (pool) {
      await pool.close();
    }
  }
} 