import { NextResponse } from "next/server";
import sql from "mssql";
import { sqlConfig } from "@/lib/db";

export async function GET(req: Request) {
  let pool: sql.ConnectionPool | null = null;
  
  try {
    // 获取连接池
    pool = await sql.connect(sqlConfig);
    
    const url = new URL(req.url);
    const search = url.searchParams.get("search");
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
    const offset = (page - 1) * pageSize;

    // 构建查询条件
    let whereClause = "";
    const params: { [key: string]: string | number } = {};
    
    if (search) {
      whereClause = "WHERE id LIKE @search OR config LIKE @search OR note LIKE @search OR detail_note LIKE @search";
      params.search = `%${search}%`;
    }

    // 构建请求
    const request = pool.request();
    
    // 添加参数
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });

    // 获取总记录数
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM YY_CONFIG 
      ${whereClause}
    `;
    const countResult = await request.query(countQuery);
    const total = countResult.recordset[0].total;

    // 获取分页数据
    const dataQuery = `
      SELECT id, config, note, detail_note 
      FROM YY_CONFIG 
      ${whereClause}
      ORDER BY id 
      OFFSET ${offset} ROWS 
      FETCH NEXT ${pageSize} ROWS ONLY
    `;
    const result = await request.query(dataQuery);

    return NextResponse.json({
      params: result.recordset,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error("获取参数配置失败:", error);
    return NextResponse.json(
      { error: "获取参数配置失败" },
      { status: 500 }
    );
  } finally {
    // 关闭连接池
    if (pool) {
      try {
        await pool.close();
      } catch (err) {
        console.error("关闭数据库连接失败:", err);
      }
    }
  }
} 