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

// 列信息接口
interface ColumnInfo {
  columnName: string;
  dataType: string;
  columnLength: number;
  decimalPlaces: number | null;
  isNullable: boolean;
  isPrimaryKey: number;
  defaultValue: string | null;
  description: string | null;
}

// 扩展Session接口
interface ExtendedSession {
  user?: {
    id: string;
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tableName = searchParams.get("name");
  
  if (!tableName) {
    return NextResponse.json(
      { error: "必须提供表名参数" },
      { status: 400 }
    );
  }
  
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

    // 查询表字段信息
    const columnsResult = await pool.request()
      .input('tableName', sql.NVarChar, tableName)
      .query(`
        SELECT 
          c.name AS columnName,
          t.name AS dataType,
          c.max_length AS columnLength,
          c.precision AS numericPrecision,
          c.scale AS decimalPlaces,
          c.is_nullable AS isNullable,
          CASE WHEN pk.column_id IS NOT NULL THEN 1 ELSE 0 END AS isPrimaryKey,
          OBJECT_DEFINITION(c.default_object_id) AS defaultValue,
          ep.value AS description
        FROM 
          sys.columns c
        JOIN 
          sys.types t ON c.user_type_id = t.user_type_id
        LEFT JOIN 
          (SELECT ic.column_id, ic.object_id
           FROM sys.index_columns ic
           JOIN sys.indexes i ON ic.object_id = i.object_id AND ic.index_id = i.index_id
           WHERE i.is_primary_key = 1) pk 
           ON c.object_id = pk.object_id AND c.column_id = pk.column_id
        LEFT JOIN 
          sys.extended_properties ep ON c.object_id = ep.major_id AND c.column_id = ep.minor_id AND ep.name = 'MS_Description'
        WHERE 
          OBJECT_ID(@tableName) = c.object_id
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

    return NextResponse.json({
      table: {
        name: tableName,
        columns: columns,
        type: "table"
      }
    });
  } catch (error) {
    console.error("获取表详情失败:", error);
    return NextResponse.json(
      { error: "获取表详情失败", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    );
  } finally {
    // 关闭数据库连接池
    if (pool) {
      await pool.close();
    }
  }
} 