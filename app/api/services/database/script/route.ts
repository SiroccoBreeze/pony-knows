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

// 扩展 Session 类型
interface ExtendedSession {
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

// 定义类型接口，避免使用any
interface ColumnInfo {
  ColumnName: string;
  DataType: string;
  MaxLength: number;
  Precision: number;
  Scale: number;
  IsNullable: boolean;
  DefaultValue: string;
  IsIdentity: boolean;
  IdentitySeed: number;
  IdentityIncrement: number;
}

interface PKInfo {
  ColumnName: string;
  PKName: string;
}

interface FKInfo {
  FKName: string;
  ColumnName: string;
  ReferencedTable: string;
  ReferencedColumn: string;
  DeleteAction: string;
  UpdateAction: string;
}

interface IndexInfo {
  IndexName: string;
  IsUnique: boolean;
  IndexType: string;
  Columns: string;
}

export async function GET(request: Request) {
  // 获取查询参数
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const name = searchParams.get('name');
  const full = searchParams.get('full') === 'true';

  if (!type || !name) {
    return NextResponse.json(
      { error: "缺少必要的参数" },
      { status: 400 }
    );
  }

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

    let script = "";

    // 根据对象类型获取创建脚本
    if (type === 'tables') {
      try {
        // 获取表的完整创建脚本，包括约束、索引等
        const tableResult = await pool.request()
          .input('tableName', sql.NVarChar, name)
          .query(`
            -- 获取表的基本信息
            SELECT 
              t.name AS TableName,
              s.name AS SchemaName
            FROM 
              sys.tables t
            JOIN 
              sys.schemas s ON t.schema_id = s.schema_id
            WHERE 
              t.name = @tableName
          `);

        if (tableResult.recordset.length === 0) {
          return NextResponse.json(
            { error: "找不到指定的表" },
            { status: 404 }
          );
        }

        const schemaName = tableResult.recordset[0].SchemaName;
        const fullTableName = `${schemaName}.${name}`;

        // 获取列信息
        const columnsResult = await pool.request()
          .input('tableName', sql.NVarChar, name)
          .query(`
            SELECT 
              c.name AS ColumnName,
              t.name AS DataType,
              c.max_length AS MaxLength,
              c.precision AS Precision,
              c.scale AS Scale,
              c.is_nullable AS IsNullable,
              CAST(ISNULL(dc.definition, '') AS NVARCHAR(MAX)) AS DefaultValue,
              ISNULL(ic.is_identity, 0) AS IsIdentity,
              ISNULL(ic.seed_value, 0) AS IdentitySeed,
              ISNULL(ic.increment_value, 0) AS IdentityIncrement
            FROM 
              sys.columns c
            JOIN 
              sys.types t ON c.user_type_id = t.user_type_id
            LEFT JOIN 
              sys.default_constraints dc ON c.default_object_id = dc.object_id
            LEFT JOIN 
              sys.identity_columns ic ON c.object_id = ic.object_id AND c.column_id = ic.column_id
            WHERE 
              c.object_id = OBJECT_ID(@tableName)
            ORDER BY 
              c.column_id
          `);

        // 获取主键信息
        const pkResult = await pool.request()
          .input('tableName', sql.NVarChar, name)
          .query(`
            SELECT 
              c.name AS ColumnName,
              i.name AS PKName
            FROM 
              sys.indexes i
            JOIN 
              sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
            JOIN 
              sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
            WHERE 
              i.object_id = OBJECT_ID(@tableName)
              AND i.is_primary_key = 1
            ORDER BY 
              ic.key_ordinal
          `);

        // 生成CREATE TABLE语句
        script = `CREATE TABLE ${fullTableName} (\n`;

        // 添加列定义
        const columns = columnsResult.recordset.map((col: ColumnInfo) => {
          let columnDef = `    ${col.ColumnName} ${col.DataType}`;

          // 添加类型长度/精度/小数位
          if (['char', 'varchar', 'nchar', 'nvarchar'].includes(col.DataType.toLowerCase())) {
            if (col.MaxLength === -1) {
              columnDef += '(MAX)';
            } else if (col.DataType.toLowerCase().startsWith('n')) {
              columnDef += `(${col.MaxLength / 2})`;
            } else {
              columnDef += `(${col.MaxLength})`;
            }
          } else if (['decimal', 'numeric'].includes(col.DataType.toLowerCase())) {
            columnDef += `(${col.Precision}, ${col.Scale})`;
          }

          // 添加NULL/NOT NULL
          columnDef += col.IsNullable ? ' NULL' : ' NOT NULL';

          // 添加默认值
          if (col.DefaultValue) {
            columnDef += ` DEFAULT ${col.DefaultValue}`;
          }

          // 添加IDENTITY
          if (col.IsIdentity) {
            columnDef += ` IDENTITY(${col.IdentitySeed}, ${col.IdentityIncrement})`;
          }

          return columnDef;
        });

        script += columns.join(',\n');

        // 添加主键约束
        if (pkResult.recordset.length > 0) {
          const pkName = pkResult.recordset[0].PKName;
          const pkColumns = pkResult.recordset.map((pk: PKInfo) => pk.ColumnName).join(', ');
          script += `,\n    CONSTRAINT ${pkName} PRIMARY KEY (${pkColumns})`;
        }

        script += '\n);';

        // 如果需要完整信息，添加外键、索引等
        if (full) {
          try {
            // 获取外键信息
            const fkResult = await pool.request()
              .input('tableName', sql.NVarChar, name)
              .query(`
                SELECT 
                  fk.name AS FKName,
                  COL_NAME(fc.parent_object_id, fc.parent_column_id) AS ColumnName,
                  OBJECT_NAME(fc.referenced_object_id) AS ReferencedTable,
                  COL_NAME(fc.referenced_object_id, fc.referenced_column_id) AS ReferencedColumn,
                  delete_referential_action_desc AS DeleteAction,
                  update_referential_action_desc AS UpdateAction
                FROM 
                  sys.foreign_keys fk
                JOIN 
                  sys.foreign_key_columns fc ON fk.object_id = fc.constraint_object_id
                WHERE 
                  fk.parent_object_id = OBJECT_ID(@tableName)
                ORDER BY 
                  fk.name, fc.constraint_column_id
              `);

            // 添加外键约束
            if (fkResult.recordset.length > 0) {
              // 按外键名分组
              const fkGroups: { [key: string]: FKInfo[] } = {};
              fkResult.recordset.forEach((fk: FKInfo) => {
                if (!fkGroups[fk.FKName]) {
                  fkGroups[fk.FKName] = [];
                }
                fkGroups[fk.FKName].push(fk);
              });

              Object.keys(fkGroups).forEach(fkName => {
                const fks = fkGroups[fkName];
                const firstFk = fks[0];
                const columnNames = fks.map((fk: FKInfo) => fk.ColumnName).join(', ');
                const referencedTable = firstFk.ReferencedTable;
                const referencedColumns = fks.map((fk: FKInfo) => fk.ReferencedColumn).join(', ');

                script += `\n\nALTER TABLE ${fullTableName} ADD CONSTRAINT ${fkName} FOREIGN KEY (${columnNames}) REFERENCES ${referencedTable}(${referencedColumns})`;
                
                if (firstFk.DeleteAction !== 'NO_ACTION') {
                  script += ` ON DELETE ${firstFk.DeleteAction.replace('_', ' ')}`;
                }
                
                if (firstFk.UpdateAction !== 'NO_ACTION') {
                  script += ` ON UPDATE ${firstFk.UpdateAction.replace('_', ' ')}`;
                }
                
                script += ';';
              });
            }
          } catch (error) {
            console.error("获取外键信息失败:", error);
            // 继续执行，不中断整个流程
          }

          try {
            // 获取索引信息（不包括主键）
            const indexResult = await pool.request()
              .input('tableName', sql.NVarChar, name)
              .query(`
                SELECT 
                  i.name AS IndexName,
                  i.is_unique AS IsUnique,
                  i.type_desc AS IndexType,
                  STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal) AS Columns
                FROM 
                  sys.indexes i
                JOIN 
                  sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
                JOIN 
                  sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
                WHERE 
                  i.object_id = OBJECT_ID(@tableName)
                  AND i.is_primary_key = 0  -- 排除主键
                  AND i.is_unique_constraint = 0  -- 排除唯一约束
                GROUP BY
                  i.name, i.is_unique, i.type_desc
              `);

            // 添加索引
            if (indexResult.recordset.length > 0) {
              indexResult.recordset.forEach((idx: IndexInfo) => {
                script += `\n\nCREATE ${idx.IsUnique ? 'UNIQUE ' : ''}INDEX ${idx.IndexName} ON ${fullTableName} (${idx.Columns});`;
              });
            }
          } catch (error) {
            console.error("获取索引信息失败:", error);
            // 继续执行，不中断整个流程
          }
        }
      } catch (error) {
        console.error("生成表结构SQL失败:", error);
        return NextResponse.json(
          { error: "生成表结构SQL失败", details: error instanceof Error ? error.message : "未知错误" },
          { status: 500 }
        );
      }
    } else if (type === 'views') {
      try {
        // 获取视图定义
        const viewResult = await pool.request()
          .input('viewName', sql.NVarChar, name)
          .query(`
            SELECT 
              OBJECT_DEFINITION(OBJECT_ID(@viewName)) AS ViewDefinition
          `);

        if (!viewResult.recordset[0]?.ViewDefinition) {
          return NextResponse.json(
            { error: "找不到指定的视图或无法获取其定义" },
            { status: 404 }
          );
        }

        script = viewResult.recordset[0].ViewDefinition;
      } catch (error) {
        console.error("获取视图定义失败:", error);
        return NextResponse.json(
          { error: "获取视图定义失败", details: error instanceof Error ? error.message : "未知错误" },
          { status: 500 }
        );
      }
    } else if (type === 'procedures' || type === 'functions') {
      try {
        // 获取存储过程或函数定义
        const routineResult = await pool.request()
          .input('routineName', sql.NVarChar, name)
          .query(`
            SELECT 
              OBJECT_DEFINITION(OBJECT_ID(@routineName)) AS RoutineDefinition
          `);

        if (!routineResult.recordset[0]?.RoutineDefinition) {
          return NextResponse.json(
            { error: `找不到指定的${type === 'procedures' ? '存储过程' : '函数'}或无法获取其定义` },
            { status: 404 }
          );
        }

        script = routineResult.recordset[0].RoutineDefinition;
      } catch (error) {
        console.error(`获取${type === 'procedures' ? '存储过程' : '函数'}定义失败:`, error);
        return NextResponse.json(
          { error: `获取${type === 'procedures' ? '存储过程' : '函数'}定义失败`, details: error instanceof Error ? error.message : "未知错误" },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "不支持的对象类型" },
        { status: 400 }
      );
    }

    return NextResponse.json({ script });
  } catch (error) {
    console.error("获取SQL脚本失败:", error);
    return NextResponse.json(
      { error: "获取SQL脚本失败", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    );
  } finally {
    // 关闭数据库连接池
    if (pool) {
      await pool.close();
    }
  }
} 