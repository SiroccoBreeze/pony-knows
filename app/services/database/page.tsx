"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Loader2, Database, Table2, Key, FileText, 
  AlertCircle, Code, Eye, BookOpen, Copy, Check, Search, Code2
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import 'prismjs';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-plsql';
import 'prismjs/themes/prism-tomorrow.css';
import Prism from 'prismjs';
import { List, AutoSizer } from 'react-virtualized';
import { useTheme } from "next-themes";
import axios from "axios";
import { CopyButton } from "@/components/CopyButton";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import { isMobileDevice } from "@/lib/utils";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CodeHighlighter } from "../../components/CodeHighlighter";

// 表/视图结构数据类型定义
interface DbColumn {
  columnName: string;
  dataType: string;
  columnLength: number | string | null;
  decimalPlaces: number | null;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue: string | null;
  description: string | null;
}

interface DbTable {
  name: string;
  columns: DbColumn[];
  type: "table" | "view";
  definition?: string; // 添加定义字段，用于存储视图创建脚本
  createDate: string;
  modifyDate: string;
}

// 存储过程/函数数据类型
interface DbRoutine {
  name: string;
  type: "procedure" | "function";
  definition: string;
  createDate: string;
  modifyDate: string;
}

// 分页数据接口
interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface CopyingState {
  [key: string]: boolean;
}

// 获取对象类型显示名称
const getObjectTypeName = (type: string): string => {
  switch(type) {
    case "tables": return "表结构";
    case "views": return "视图";
    case "procedures": return "存储过程";
    case "functions": return "函数";
    case "params": return "参数";
    default: return "数据库对象";
  }
};

// 获取当前类型的图标
const getTypeIcon = (type: string, className: string = "h-4 w-4 mr-2") => {
  switch(type) {
    case "tables":
      return <Table2 className={className} />;
    case "views":
      return <Eye className={className} />;
    case "procedures":
      return <Code2 className={className} />;
    case "functions":
      return <Code2 className={className} />;
    case "params":
      return <FileText className={className} />;
    default:
      return <Database className={className} />;
  }
};

export default function DatabaseStructurePage() {
  const [copying, setCopying] = useState<CopyingState>({});
  const [isMobile, setIsMobile] = useState(false);
  const [activeObjectType, setActiveObjectType] = useState<string>("tables");
  const [dbObjects, setDbObjects] = useState<{
    tables: DbTable[];
    views: DbTable[];
    procedures: DbRoutine[];
    functions: DbRoutine[];
  }>({
    tables: [],
    views: [],
    procedures: [],
    functions: []
  });
  const [filteredObjects, setFilteredObjects] = useState<(DbTable | DbRoutine)[]>([]);
  const [activeObject, setActiveObject] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const searchRef = useRef<string>("");
  const [loading, setLoading] = useState<{[key: string]: boolean}>({
    tables: false,
    views: false,
    procedures: false,
    functions: false,
    params: false
  });
  const [objectsLoaded, setObjectsLoaded] = useState<{[key: string]: boolean}>({
    tables: false,
    views: false,
    procedures: false,
    functions: false,
    params: false
  });
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState<{[key: string]: PaginationInfo}>({
    tables: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
    views: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
    procedures: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
    functions: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
    params: { total: 0, page: 1, pageSize: 20, totalPages: 0 }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // 添加参数配置相关的状态和函数
  const [configParams, setConfigParams] = useState<{
    id: string;
    config: string;
    note: string | null;
    detail_note: string | null;
  }[]>([]);

  // 所有 useEffect 和 useCallback 定义
  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  const loadPage = useCallback(async (type: string, page: number = 1, searchTerm: string = "") => {
    if (isLoading || loading[type]) return;
    
    setIsLoading(true);
    setLoading(prev => ({...prev, [type]: true}));
    
    try {
      let apiUrl = `/api/services/database/${type}?page=${page}&pageSize=20`;
      
      if (searchTerm) {
        apiUrl += `&search=${encodeURIComponent(searchTerm)}&ignoreCase=true`;
      }
      
      console.log(`正在请求API: ${apiUrl}`);
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`API返回数据:`, data);
      
      if (type === "params") {
        // 根据返回的数据结构调整处理方式
        const items = data.params || [];
        console.log(`参数配置数据:`, items);
        setConfigParams(items);
        
        // 确保分页信息被正确更新
        if (data.pagination) {
          setPagination(prev => ({
            ...prev,
            [type]: data.pagination
          }));
        }
        
        // 对于参数配置，只显示ID列表
        const paramList = items.map((item: {id: string; config: string; note: string | null; detail_note: string | null}) => ({ 
          id: item.id, 
          name: item.id 
        }));
        
        if (page === 1) {
          setFilteredObjects(paramList);
        } else {
          // 添加分页逻辑，追加新的数据
          setFilteredObjects(prev => {
            const prevIds = new Set(prev.map((p: any) => 'id' in p ? p.id : p.name));
            const newItems = paramList.filter(p => !prevIds.has(p.id));
            return [...prev, ...newItems];
          });
        }
      } else {
      // 更新分页信息
      if (data.pagination) {
        setPagination(prev => ({
          ...prev,
          [type]: data.pagination
        }));
      }
      
      // 根据类型更新对象列表
      switch(type) {
        case "tables":
          if (data.tables && Array.isArray(data.tables)) {
            const uniqueTables = data.tables.filter((table: DbTable, index: number, self: DbTable[]) =>
              index === self.findIndex((t: DbTable) => t.name === table.name)
            );
            
            if (page === 1) {
              setDbObjects(prev => ({...prev, tables: uniqueTables}));
              if (uniqueTables.length > 0 && (!activeObject || activeObjectType !== "tables")) {
                setActiveObject(uniqueTables[0].name);
              }
              if (activeObjectType === "tables") {
                setFilteredObjects(uniqueTables);
              }
            } else {
              setDbObjects(prev => {
                const allTables = [...prev.tables];
                uniqueTables.forEach((table: DbTable) => {
                  if (!allTables.some(t => t.name === table.name)) {
                    allTables.push(table);
                  }
                });
                return {...prev, tables: allTables};
              });
              
              if (activeObjectType === "tables") {
                setFilteredObjects(prev => {
                  const newFiltered = [...prev];
                  uniqueTables.forEach((table: DbTable) => {
                    if (!newFiltered.some(t => 'name' in t && t.name === table.name)) {
                      newFiltered.push(table);
                    }
                  });
                  return newFiltered;
                });
              }
            }
          }
          break;
        
        case "views":
          if (data.views && Array.isArray(data.views)) {
            const uniqueViews = data.views.filter((view: DbTable, index: number, self: DbTable[]) =>
              index === self.findIndex((v: DbTable) => v.name === view.name)
            );
            
            if (page === 1) {
              setDbObjects(prev => ({...prev, views: uniqueViews}));
              if (uniqueViews.length > 0 && (!activeObject || activeObjectType !== "views")) {
                setActiveObject(uniqueViews[0].name);
              }
              if (activeObjectType === "views") {
                setFilteredObjects(uniqueViews);
              }
            } else {
              setDbObjects(prev => {
                const allViews = [...prev.views];
                uniqueViews.forEach((view: DbTable) => {
                  if (!allViews.some(v => v.name === view.name)) {
                    allViews.push(view);
                  }
                });
                return {...prev, views: allViews};
              });
              
              if (activeObjectType === "views") {
                setFilteredObjects(prev => {
                  const newFiltered = [...prev];
                  uniqueViews.forEach((view: DbTable) => {
                    if (!newFiltered.some(v => 'name' in v && v.name === view.name)) {
                      newFiltered.push(view);
                    }
                  });
                  return newFiltered;
                });
              }
            }
          }
          break;
          
        case "procedures":
          if (data.procedures && Array.isArray(data.procedures)) {
            const uniqueProcedures = data.procedures.filter((proc: DbRoutine, index: number, self: DbRoutine[]) =>
              index === self.findIndex((p: DbRoutine) => p.name === proc.name)
            );
            
            if (page === 1) {
              setDbObjects(prev => ({...prev, procedures: uniqueProcedures}));
              if (uniqueProcedures.length > 0 && (!activeObject || activeObjectType !== "procedures")) {
                setActiveObject(uniqueProcedures[0].name);
              }
              if (activeObjectType === "procedures") {
                setFilteredObjects(uniqueProcedures);
              }
            } else {
              setDbObjects(prev => {
                const allProcedures = [...prev.procedures];
                uniqueProcedures.forEach((proc: DbRoutine) => {
                  if (!allProcedures.some(p => p.name === proc.name)) {
                    allProcedures.push(proc);
                  }
                });
                return {...prev, procedures: allProcedures};
              });
              
              if (activeObjectType === "procedures") {
                setFilteredObjects(prev => {
                  const newFiltered = [...prev];
                  uniqueProcedures.forEach((proc: DbRoutine) => {
                    if (!newFiltered.some(p => 'name' in p && p.name === proc.name)) {
                      newFiltered.push(proc);
                    }
                  });
                  return newFiltered;
                });
              }
            }
          }
          break;
          
        case "functions":
          if (data.functions && Array.isArray(data.functions)) {
            const uniqueFunctions = data.functions.filter((func: DbRoutine, index: number, self: DbRoutine[]) =>
              index === self.findIndex((f: DbRoutine) => f.name === func.name)
            );
            
            if (page === 1) {
              setDbObjects(prev => ({...prev, functions: uniqueFunctions}));
              if (uniqueFunctions.length > 0 && (!activeObject || activeObjectType !== "functions")) {
                setActiveObject(uniqueFunctions[0].name);
              }
              if (activeObjectType === "functions") {
                setFilteredObjects(uniqueFunctions);
              }
            } else {
              setDbObjects(prev => {
                const allFunctions = [...prev.functions];
                uniqueFunctions.forEach((func: DbRoutine) => {
                  if (!allFunctions.some(f => f.name === func.name)) {
                    allFunctions.push(func);
                  }
                });
                return {...prev, functions: allFunctions};
              });
              
              if (activeObjectType === "functions") {
                setFilteredObjects(prev => {
                  const newFiltered = [...prev];
                  uniqueFunctions.forEach((func: DbRoutine) => {
                    if (!newFiltered.some(f => 'name' in f && f.name === func.name)) {
                      newFiltered.push(func);
                    }
                  });
                  return newFiltered;
                });
              }
            }
          }
          break;
      }
      }
    } catch (error: any) {
      console.error("加载数据失败:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
      setLoading(prev => ({...prev, [type]: false}));
      setObjectsLoaded(prev => ({...prev, [type]: true}));
    }
  }, [isLoading, loading, activeObjectType]);

  const getActiveObjectData = useCallback(() => {
    if (!activeObject) return null;
    
    if (activeObjectType === "params") {
      return configParams.find(param => param.id === activeObject);
    }
    
    switch(activeObjectType) {
      case "tables":
        return dbObjects.tables.find(t => t.name === activeObject);
      case "views":
        return dbObjects.views.find(v => v.name === activeObject);
      case "procedures":
        return dbObjects.procedures.find(p => p.name === activeObject);
      case "functions":
        return dbObjects.functions.find(f => f.name === activeObject);
      default:
        return null;
    }
  }, [activeObject, activeObjectType, dbObjects, configParams]);

  const loadTableStructure = useCallback(async (tableName: string) => {
    if (!tableName) return;
    
    // 检查表是否已有完整字段信息
    const table = dbObjects.tables.find(t => t.name === tableName);
    if (table && table.columns && table.columns.length > 0) return;
    
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/services/database/tables/detail?name=${encodeURIComponent(tableName)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.table) {
          setDbObjects(prev => {
            const newTables = [...prev.tables];
            const idx = newTables.findIndex(t => t.name === tableName);
            if (idx >= 0) {
              newTables[idx] = {
                ...newTables[idx],
                columns: data.table.columns || []
              };
            }
            return {...prev, tables: newTables};
          });
        }
      }
    } catch (error) {
      console.error("加载表结构失败:", error);
      toast.error("加载表结构失败");
    } finally {
      setDetailLoading(false);
    }
  }, [dbObjects.tables]);

  const handleObjectClick = useCallback(async (objectName: string) => {
    // 如果点击同一个对象，不重复处理
    if (activeObject === objectName) return;
    
    setActiveObject(objectName);
    
    // 根据不同类型对象加载详情
    if (activeObjectType === "tables") {
      loadTableStructure(objectName);
    } else if (activeObjectType === "views") {
      // 视图处理逻辑 - 改为获取创建脚本而不是结构
      setDetailLoading(true);
      try {
        const response = await fetch(`/api/services/database/script?type=views&name=${encodeURIComponent(objectName)}&full=true`);
        if (response.ok) {
          const data = await response.json();
          if (data.script) {
            setDbObjects(prev => {
              const newViews = [...prev.views];
              const idx = newViews.findIndex(v => v.name === objectName);
              if (idx >= 0) {
                newViews[idx] = {
                  ...newViews[idx],
                  definition: data.script // 保存创建脚本
                };
              }
              return {...prev, views: newViews};
            });
          }
        }
      } catch (error) {
        console.error("加载视图定义失败:", error);
        toast.error("加载视图定义失败");
      } finally {
        setDetailLoading(false);
      }
    } else if ((activeObjectType === "procedures" || activeObjectType === "functions")) {
      // 存储过程或函数
      console.log(`加载${activeObjectType === "procedures" ? "存储过程" : "函数"}定义: ${objectName}`);
     
      // 无论是否有定义，都尝试加载一次，确保最新数据
      setDetailLoading(true);
      try {
        const response = await fetch(`/api/services/database/script?type=${activeObjectType}&name=${encodeURIComponent(objectName)}`);
        if (response.ok) {
          const data = await response.json();
          
          // 更新定义
          if (data.script) {
            setDbObjects(prev => {
              const newData = {...prev};
              if (activeObjectType === "procedures") {
                const procedures = [...prev.procedures];
                const idx = procedures.findIndex(p => p.name === objectName);
                if (idx >= 0) {
                  procedures[idx] = {
                    ...procedures[idx],
                    definition: data.script
                  };
                }
                newData.procedures = procedures;
              } else {
                const functions = [...prev.functions];
                const idx = functions.findIndex(f => f.name === objectName);
                if (idx >= 0) {
                  functions[idx] = {
                    ...functions[idx],
                    definition: data.script
                  };
                }
                newData.functions = functions;
              }
              return newData;
            });
          }
        }
      } catch (error) {
        console.error("加载定义失败:", error);
        toast.error("加载定义失败");
      } finally {
        setDetailLoading(false);
      }
    }
  }, [activeObject, activeObjectType, dbObjects, loadTableStructure]);

  const handleSearch = useCallback((term: string) => {
    console.log("执行模糊搜索:", term);
    setIsSearching(true);
    // 不需要转换大小写，保持原始输入，让API处理不区分大小写的搜索
    loadPage(activeObjectType, 1, term);
  }, [activeObjectType, loadPage]);

  useEffect(() => {
    if (searchRef.current === searchTerm) return;
    searchRef.current = searchTerm;
  }, [searchTerm, activeObjectType]);

  useEffect(() => {
    if (!loading[activeObjectType] && isSearching) {
      setIsSearching(false);
    }
  }, [loading, activeObjectType, isSearching]);

  useEffect(() => {
    if (objectsLoaded[activeObjectType]) {
      switch(activeObjectType) {
        case "tables":
          setFilteredObjects(dbObjects.tables);
          break;
        case "views":
          setFilteredObjects(dbObjects.views);
          break;
        case "procedures":
          setFilteredObjects(dbObjects.procedures);
          break;
        case "functions":
          setFilteredObjects(dbObjects.functions);
          break;
        case "params":
          // 确保参数配置也被设置到筛选列表中
          const paramList = configParams.map(item => ({ 
            id: item.id, 
            name: item.id 
          }));
          setFilteredObjects(paramList);
          break;
      }
    } else if (!loading[activeObjectType] && !isLoading) {
      loadPage(activeObjectType, 1);
    }
  }, [activeObjectType, dbObjects, configParams, objectsLoaded, loading, isLoading, loadPage]);

  const copyCreateSql = async (objectType: string, objectName: string) => {
    let sql = "";
    
    if (objectType === "tables" || objectType === "views") {
      const obj = objectType === "tables" 
        ? dbObjects.tables.find(t => t.name === objectName)
        : dbObjects.views.find(v => v.name === objectName);
      
      if (!obj) return;
      
      // 获取表或视图的创建SQL（可以从API获取）
      try {
        setCopying({[objectName]: true});
        // 修改URL，确保正确获取完整SQL脚本
        const response = await fetch(`/api/services/database/script?type=${objectType}&name=${encodeURIComponent(objectName)}&full=true`);
        
        if (!response.ok) {
          throw new Error(`请求失败: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.script) {
          throw new Error("获取SQL脚本失败：返回数据为空");
        }
        
        sql = data.script;
        
        // 尝试使用现代API
        try {
          await navigator.clipboard.writeText(sql);
        } catch {
          // 兼容性方案：创建一个临时文本区域来复制
          const textArea = document.createElement('textarea');
          textArea.value = sql;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
        
        toast.success(`已复制 ${objectName} 的创建语句到剪贴板`);
      } catch (error) {
        console.error("复制失败:", error);
        toast.error("复制失败: " + (error instanceof Error ? error.message : "未知错误"));
      } finally {
        // 延迟清除复制状态，给用户更多视觉反馈
        setTimeout(() => {
          setCopying({});
        }, 1000);
      }
    } else if (objectType === "procedures" || objectType === "functions") {
      // 直接使用存储过程或函数的定义
      const obj = objectType === "procedures"
        ? dbObjects.procedures.find(p => p.name === objectName)
        : dbObjects.functions.find(f => f.name === objectName);
      
      if (!obj) return;
      
      try {
        setCopying({[objectName]: true});
        
        try {
          await navigator.clipboard.writeText(obj.definition);
        } catch {
          // 兼容性方案
          const textArea = document.createElement('textarea');
          textArea.value = obj.definition;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
        
        toast.success(`已复制 ${objectName} 的定义到剪贴板`);
      } catch (error) {
        console.error("复制失败:", error);
        toast.error("复制失败: " + (error instanceof Error ? error.message : "未知错误"));
      } finally {
        // 延迟清除复制状态
        setTimeout(() => {
          setCopying({});
        }, 1000);
      }
    }
  };
  
  const copyAlterAddSql = async (tableName: string, column: DbColumn) => {
    try {
      setCopying({[`${tableName}_${column.columnName}`]: true});
      
      // 构建ALTER语句
      let sql = `ALTER TABLE ${tableName} ADD ${column.columnName} ${column.dataType}`;
      
      // 添加长度
      if (column.columnLength) {
        if (column.columnLength === "MAX") {
          sql += "(MAX)";
        } else if (
          ["char", "varchar", "nchar", "nvarchar", "binary", "varbinary"].includes(column.dataType.toLowerCase())
        ) {
          sql += `(${column.columnLength})`;
        } else if (
          ["decimal", "numeric"].includes(column.dataType.toLowerCase()) && 
          column.decimalPlaces !== null
        ) {
          sql += `(${column.columnLength}, ${column.decimalPlaces})`;
        }
      }
      
      // 添加是否允许NULL
      sql += column.isNullable ? " NULL" : " NOT NULL";
      
      // 添加默认值
      if (column.defaultValue) {
        sql += ` DEFAULT ${column.defaultValue}`;
      }
      
      await navigator.clipboard.writeText(sql);
      toast.success(`已复制 ${column.columnName} 的ALTER语句到剪贴板`);
    } catch (error) {
      console.error("复制失败:", error);
      toast.error("复制失败: " + (error instanceof Error ? error.message : "未知错误"));
    } finally {
      setCopying({});
    }
  };

  // 复制表结构到剪贴板
  const copyTableStructure = async (table: DbTable) => {
    try {
      setCopying({[`structure_${table.name}`]: true});
      
      // 生成表结构文本
      let structureText = `表名: ${table.name}\n`;
      structureText += `创建时间: ${new Date(table.createDate).toLocaleString()}\n`;
      structureText += `修改时间: ${new Date(table.modifyDate).toLocaleString()}\n\n`;
      structureText += "字段列表:\n";
      
      // 表头
      structureText += "字段名称\t数据类型\t长度\t小数位\t允许NULL\t默认值\t字段说明\n";
      structureText += "--------------------------------------------------------------\n";
      
      // 表内容
      if (table.columns && table.columns.length > 0) {
        table.columns.forEach(column => {
          structureText += `${column.columnName}\t`;
          structureText += `${column.dataType}\t`;
          structureText += `${column.columnLength !== null ? column.columnLength : '-'}\t`;
          structureText += `${column.decimalPlaces !== null ? column.decimalPlaces : '-'}\t`;
          structureText += `${column.isNullable ? '是' : '否'}\t`;
          structureText += `${column.defaultValue || '-'}\t`;
          structureText += `${column.description || '-'}\n`;
        });
      }
      
      // 尝试使用现代API
      try {
        await navigator.clipboard.writeText(structureText);
      } catch {
        // 兼容性方案：创建一个临时文本区域来复制
        const textArea = document.createElement('textarea');
        textArea.value = structureText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      toast.success(`已复制 ${table.name} 的表结构到剪贴板`);
    } catch (error) {
      console.error("复制失败:", error);
      toast.error("复制失败: " + (error instanceof Error ? error.message : "未知错误"));
    } finally {
      // 延迟清除复制状态，给用户更多视觉反馈
      setTimeout(() => {
        setCopying({});
      }, 1000);
    }
  };

  const renderVirtualList = useCallback(() => {
    const currentPage = pagination[activeObjectType].page;
    const totalPages = pagination[activeObjectType].totalPages;
    const total = pagination[activeObjectType].total;
    
    // 统一处理加载和空状态显示
    if ((loading[activeObjectType] || isSearching) && filteredObjects.length === 0) {
      return (
        <div className="px-2 py-4 text-center text-muted-foreground">
          <div className="flex items-center justify-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            正在{isSearching ? '搜索' : '加载'}{getObjectTypeName(activeObjectType)}...
          </div>
        </div>
      );
    }
    
    if (filteredObjects.length === 0) {
      return (
        <div className="px-2 py-4 text-center text-muted-foreground">
          {searchTerm ? (
            <>
              <AlertCircle className="mx-auto h-5 w-5 mb-1" />
              <p>未找到匹配&ldquo;{searchTerm}&rdquo;的{getObjectTypeName(activeObjectType)}</p>
            </>
          ) : (
            `没有${getObjectTypeName(activeObjectType)}数据`
          )}
        </div>
      );
    }

    // 计算列表高度，留出加载更多按钮的空间
    const listHeight = totalPages > 1 ? "calc(100vh-340px)" : "calc(100vh-300px)";

    // 使用虚拟列表渲染大量项目
    return (
      <div className="w-full flex flex-col">
        <div className="h-[calc(100vh-340px)]" style={{ height: listHeight }}>
          <AutoSizer>
            {({ height, width }: { height: number; width: number }) => (
              <List
                height={height}
                width={width}
                rowCount={filteredObjects.length}
                rowHeight={30}
                overscanRowCount={10}
                rowRenderer={({ index, style, key }: { index: number; key: string; style: React.CSSProperties }) => {
                  const obj = filteredObjects[index];
                  const isActive = activeObject === obj.name;
                  
                  return (
                    <div 
                      key={key || `${activeObjectType}-${obj.name}-${index}`}
                      style={{...style, padding: '0 2px'}}
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        className={`w-full justify-start font-normal text-left group text-xs ${isActive ? 'bg-primary text-primary-foreground' : ''} h-7`}
                        onClick={() => handleObjectClick(obj.name)}
                      >
                        <div className="flex items-center w-full">
                          <div className="truncate flex-1">
                            {activeObjectType === "tables" && <Table2 className={`h-3 w-3 inline mr-1 ${isActive ? 'text-primary-foreground' : 'text-blue-500'}`} />}
                            {activeObjectType === "views" && <Eye className={`h-3 w-3 inline mr-1 ${isActive ? 'text-primary-foreground' : 'text-green-500'}`} />}
                            {activeObjectType === "procedures" && <BookOpen className={`h-3 w-3 inline mr-1 ${isActive ? 'text-primary-foreground' : 'text-amber-500'}`} />}
                            {activeObjectType === "functions" && <Code className={`h-3 w-3 inline mr-1 ${isActive ? 'text-primary-foreground' : 'text-purple-500'}`} />}
                                  <span className="text-xs truncate">{obj.name}</span>
                          </div>
                          <div 
                                  className={`${isActive ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 transition-opacity ml-1`}
                            onClick={(e) => {
                              e.stopPropagation();
                              copyCreateSql(activeObjectType, obj.name);
                            }}
                          >
                            {copying[obj.name] ? 
                              <Check className={`h-3 w-3 ${isActive ? 'text-primary-foreground' : 'text-green-500'}`} /> : 
                              <Copy className={`h-3 w-3 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                            }
                          </div>
                        </div>
                      </Button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[300px]">
                            <p className="text-xs whitespace-normal break-all">{obj.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  );
                }}
              />
            )}
          </AutoSizer>
        </div>
        
        {/* 加载更多按钮 - 调整样式避免遮挡内容 */}
        {currentPage < totalPages && (
          <div className="py-1 px-2 mt-1">
            <Button 
              variant="outline" 
              className="w-full text-xs h-7" 
              onClick={() => loadPage(activeObjectType, currentPage + 1)}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  <span className="text-xs">加载中...</span>
                </>
              ) : (
                <>
                  <span className="text-xs">加载更多 ({filteredObjects.length}/{total})</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    );
  }, [activeObject, activeObjectType, filteredObjects, isLoading, loading, pagination, copying, loadPage, searchTerm, handleObjectClick, copyCreateSql]);

  const renderObjectDetails = useCallback(() => {
    const activeData = getActiveObjectData();
    
    // 参数配置视图
    if (activeObjectType === "params") {
      // 如果没有选中参数或找不到选中的参数
      if (!activeData) {
        return (
          <Card className="h-[calc(100vh-8rem)]">
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">参数配置</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 text-center text-muted-foreground py-8">
                <FileText className="h-6 w-6 mx-auto mb-2" />
                <p>请从左侧选择一个参数ID</p>
              </div>
            </CardContent>
          </Card>
        );
      }
      
      // 显示选中的单个参数详情，字段名保持英文
      const param = activeData as {id: string; config: string; note: string | null; detail_note: string | null};
      
      return (
        <Card className="h-[calc(100vh-8rem)]">
          <CardHeader className="pb-2 pt-3 px-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">参数详情：{param.id}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-1">id</h3>
                <div className="bg-muted p-2 rounded text-sm">{param.id}</div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-1">config</h3>
                <div className="bg-muted p-2 rounded text-sm break-all whitespace-pre-wrap">{param.config}</div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-1">note</h3>
                <div className="bg-muted p-2 rounded text-sm min-h-[40px]">{param.note}</div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-1">detail_note</h3>
                <div className="bg-muted p-2 rounded text-sm min-h-[60px] whitespace-pre-wrap">{param.detail_note}</div>
              </div>
              
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                  onClick={async () => {
                    try {
                      // 步骤1: 先获取YY_CONFIG表结构
                      const response = await fetch(`/api/services/database/tables/detail?name=YY_CONFIG&includeColumns=true`);
                      if (!response.ok) {
                        throw new Error('获取表结构失败');
                      }
                      
                      const data = await response.json();
                      if (!data.table || !data.table.columns || data.table.columns.length === 0) {
                        throw new Error('无法获取表结构信息');
                      }
                      
                      // 步骤2: 构建INSERT语句
                      const columns = data.table.columns.map(col => col.columnName).join(', ');
                      
                      // 步骤3: 根据当前参数值构建VALUES部分
                      const values = data.table.columns.map(col => {
                        const colName = col.columnName;
                        // 检查参数是否有此字段的值
                        if (colName === 'id') {
                          return `'${param.id}'`;
                        } else if (colName === 'config') {
                          return param.config ? `'${param.config.replace(/'/g, "''")}'` : 'NULL';
                        } else if (colName === 'note') {
                          return param.note ? `'${param.note.replace(/'/g, "''")}'` : 'NULL';
                        } else if (colName === 'detail_note') {
                          return param.detail_note ? `'${param.detail_note.replace(/'/g, "''")}'` : 'NULL';
                        } else {
                          // 对于其他未知字段，默认使用NULL
                          return 'NULL';
                        }
                      }).join(', ');
                      
                      // 生成完整的INSERT语句
                      const insertSql = `INSERT INTO YY_CONFIG (${columns}) VALUES (${values});`;
                      
                      // 复制到剪贴板
                      await navigator.clipboard.writeText(insertSql);
                      toast.success('已复制完整SQL语句到剪贴板');
                    } catch (error) {
                      console.error('生成INSERT语句失败:', error);
                      toast.error(`生成SQL失败: ${error.message}`);
                      
                      // 失败后回退到基本INSERT语句
                      const basicInsertSql = `INSERT INTO YY_CONFIG (id, config, note, detail_note) VALUES ('${param.id}', ${param.config ? `'${param.config.replace(/'/g, "''")}'` : 'NULL'}, ${param.note ? `'${param.note.replace(/'/g, "''")}'` : 'NULL'}, ${param.detail_note ? `'${param.detail_note.replace(/'/g, "''")}'` : 'NULL'});`;
                      await navigator.clipboard.writeText(basicInsertSql);
                    }
                  }}
                >
                  复制INSERT语句
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    if (!activeData) {
      return (
        <Card className="border-dashed h-[calc(100vh-8rem)]">
          <CardContent className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center justify-center text-center">
              <Database className="h-8 w-8 text-muted-foreground mb-2" />
              <h3 className="text-base font-semibold mb-1">暂无数据</h3>
              <p className="text-sm text-muted-foreground">
                请先选择一个{getObjectTypeName(activeObjectType)}
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    // 针对表显示结构
    if (activeObjectType === "tables") {
      const tableData = activeData as DbTable;
      return (
        <Card className="h-[calc(100vh-8rem)]">
          <CardHeader className="pb-2 pt-3 px-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Table2 className="h-4 w-4 text-primary" />
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="cursor-pointer hover:underline" onClick={() => copyCreateSql(activeObjectType, tableData.name)}>
                    {tableData.name}
                  </span>
                  <Badge className="ml-1 text-xs" variant="outline">
                    {tableData.columns?.length || 0} 列
                  </Badge>
                  <button 
                    className="p-1 rounded hover:bg-muted transition-colors flex items-center gap-1"
                    onClick={() => copyCreateSql(activeObjectType, tableData.name)}
                    disabled={!!copying[tableData.name]}
                    title="复制CREATE TABLE语句"
                  >
                    {copying[tableData.name] ? 
                      <Check className="h-3 w-3 text-green-500" /> : 
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    }
                  </button>
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-0 border-t">
              <div className="overflow-auto max-h-[calc(100vh-12rem)]">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>加载表结构中...</span>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/6 font-medium text-xs">字段名称</TableHead>
                        <TableHead className="w-1/8 font-medium text-xs">数据类型</TableHead>
                        <TableHead className="w-1/12 text-center font-medium text-xs">长度</TableHead>
                        <TableHead className="w-1/12 text-center font-medium text-xs">小数位</TableHead>
                        <TableHead className="w-1/12 text-center font-medium text-xs">允许NULL</TableHead>
                        <TableHead className="w-1/6 font-medium text-xs">默认值</TableHead>
                        <TableHead className="w-1/4 font-medium text-xs">字段说明</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableData.columns && tableData.columns.map((column) => (
                        <TableRow key={`${tableData.name}-${column.columnName}`}>
                          <TableCell className="font-medium text-xs py-1.5 whitespace-nowrap">
                            <div className="flex items-center">
                              {column.isPrimaryKey && <Key className="h-3 w-3 text-amber-500 mr-1" />}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button 
                                      className="text-left cursor-pointer hover:underline focus:outline-none"
                                      onClick={() => copyAlterAddSql(tableData.name, column)}
                                    >
                                      {column.columnName}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="right">
                                    <p className="text-xs">点击复制ALTER语句</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              {copying[`${tableData.name}_${column.columnName}`] && (
                                <Check className="ml-1 h-3 w-3 text-green-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs py-1.5">{column.dataType}</TableCell>
                          <TableCell className="text-xs py-1.5 text-center">{column.columnLength !== null ? column.columnLength : '-'}</TableCell>
                          <TableCell className="text-xs py-1.5 text-center">{column.decimalPlaces !== null ? column.decimalPlaces : '-'}</TableCell>
                          <TableCell className="text-xs py-1.5 text-center">
                            {column.isNullable ? 
                              <Badge variant="outline" className="text-xs h-4 px-1">是</Badge> : 
                              <Badge variant="secondary" className="text-xs h-4 px-1">否</Badge>
                            }
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate text-xs py-1.5">
                            {column.defaultValue || '-'}
                          </TableCell>
                          <TableCell className="max-w-xs text-xs py-1.5">
                            {column.description ? (
                              <div className="flex items-center truncate max-w-full">
                                <FileText className="mr-1 h-3 w-3 shrink-0" />
                                <span className="truncate">{column.description}</span>
                              </div>
                            ) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {(!tableData.columns || tableData.columns.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-sm">
                            没有列数据
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    } 
    // 视图、存储过程和函数显示定义 - 将视图改为与存储过程、函数一样显示创建脚本
    else {
      const routineData = activeData as DbRoutine;
      const typeIcon = activeObjectType === "views" 
        ? <Eye className="h-4 w-4 text-primary" />
        : (activeObjectType === "procedures" 
            ? <BookOpen className="h-4 w-4 text-primary" /> 
            : <Code className="h-4 w-4 text-primary" />);
      
      return (
        <Card className="h-[calc(100vh-8rem)]">
          <CardHeader className="pb-1 pt-2 px-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {typeIcon}
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="cursor-pointer hover:underline" onClick={() => copyCreateSql(activeObjectType, routineData.name)}>
                    {routineData.name}
                  </span>
                  <button 
                    className="p-1 rounded hover:bg-muted transition-colors"
                    onClick={() => copyCreateSql(activeObjectType, routineData.name)}
                    disabled={!!copying[routineData.name]}
                  >
                    {copying[routineData.name] ? 
                      <Check className="h-3 w-3 text-green-500" /> : 
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    }
                  </button>
                </CardTitle>
              </div>
            </div>
            {/* 对于存储过程和函数显示创建/修改日期 - 使用更紧凑的布局 */}
            {(activeObjectType === "procedures" || activeObjectType === "functions") && (
              <div className="flex items-center gap-2 mt-0 text-[10px] text-muted-foreground">
                <span>创建: {new Date(routineData.createDate).toLocaleString()}</span>
                <span>|</span>
                <span>修改: {new Date(routineData.modifyDate).toLocaleString()}</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t">
              <div className="overflow-hidden max-h-[calc(100vh-10rem)]">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>加载代码中...</span>
                  </div>
                ) : routineData.definition ? (
                  <div className="h-[calc(100vh-10rem)]">
                    <CodeHighlighter code={routineData.definition} />
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground py-8">
                    <Code className="h-6 w-6 mx-auto mb-2" />
                    <p>暂无定义内容，请点击刷新按钮加载</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
  }, [activeObjectType, getActiveObjectData, copying, copyCreateSql, copyAlterAddSql, copyTableStructure, detailLoading, getObjectTypeName, configParams]);

  const handleCopyClick = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopying((prev: CopyingState) => ({ ...prev, [text]: true }));
      setTimeout(() => {
        setCopying((prev: CopyingState) => ({ ...prev, [text]: false }));
      }, 2000);
      toast.success('已复制到剪贴板');
    } catch (err) {
      toast.error('复制失败');
    }
  }, []);

  // 移动端检测
  if (isMobile) {
  return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 text-foreground">数据库表结构</h1>
            <p className="text-muted-foreground">移动端暂不支持表结构查看功能，请使用桌面端访问。</p>
          </div>
          <div className="bg-muted/30 p-4 rounded-lg">
            <p className="text-muted-foreground mb-4">
              为了更好的表结构查看体验，请使用桌面端访问此页面。
            </p>
            <Button asChild>
              <Link href="/">
                返回首页
              </Link>
                    </Button>
          </div>
        </div>
      </div>
    );
  }

  // 桌面端渲染
  return (
    <div className="px-4 py-6 w-full">
      <Toaster />
      
      <div className="flex flex-col lg:flex-row gap-4 max-w-screen-2xl mx-auto">
        {/* 左侧面板 - 保持固定宽度 */}
        <div className="w-full lg:w-80 xl:w-96 shrink-0 space-y-4">
          {/* 搜索和类型选择卡片 */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  数据库对象
                </CardTitle>
                <div className="text-xs text-muted-foreground">
                  {filteredObjects.length} / {pagination[activeObjectType].total} 个对象
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 搜索框和按钮 */}
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSearch(searchTerm);
              }} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    type="search"
                    placeholder="搜索对象..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
                <Button 
                  type="submit"
                  size="sm"
                  disabled={loading[activeObjectType]}
                >
                  查询
                </Button>
              </form>

              {/* 对象类型选择 */}
              <div className="flex gap-2 items-center">
                <Select
                  value={activeObjectType}
                  onValueChange={(value) => {
                    setActiveObjectType(value);
                    setActiveObject(""); // 重置选中的对象
                    setFilteredObjects([]); // 清空过滤列表
                    
                    // 无论是否加载过，都重新加载数据，确保切换到参数配置时也能正确加载
                    loadPage(value, 1);
                  }}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="选择对象类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem key="tables" value="tables">
                      <div className="flex items-center gap-2">
                        <Table2 className="h-4 w-4" />
                        <span>表结构</span>
                      </div>
                    </SelectItem>
                    <SelectItem key="views" value="views">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        <span>视图</span>
                      </div>
                    </SelectItem>
                    <SelectItem key="procedures" value="procedures">
                      <div className="flex items-center gap-2">
                        <Code2 className="h-4 w-4" />
                        <span>存储过程</span>
                      </div>
                    </SelectItem>
                    <SelectItem key="functions" value="functions">
                      <div className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        <span>函数</span>
                      </div>
                    </SelectItem>
                    <SelectItem key="params" value="params">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>参数配置</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* 刷新按钮 */}
                <Button 
                  onClick={() => loadPage(activeObjectType, 1)} 
                  disabled={loading[activeObjectType]}
                  size="sm"
                  variant="outline"
                >
                  {loading[activeObjectType] ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <div className="flex items-center gap-1">
                      {getTypeIcon(activeObjectType, "h-4 w-4")}
                      刷新
                    </div>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* 对象列表 */}
          <Card className="flex-1 overflow-hidden shadow-sm">
            <ScrollArea className="h-[calc(100vh-22rem)]">
              <div className="space-y-1 p-2">
                {filteredObjects.map((obj, index) => (
                  <TooltipProvider key={`tooltip-${obj.id || obj.name}-${index}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          key={`${activeObjectType}-${obj.id || obj.name}-${index}`}
                          variant={activeObject === (obj.id || obj.name) ? "secondary" : "ghost"}
                          className={`w-full justify-start text-left ${
                            activeObject === (obj.id || obj.name) ? "bg-secondary" : ""
                          } hover:bg-secondary/50 transition-colors duration-200`}
                          onClick={() => handleObjectClick(obj.id || obj.name)}
                        >
                          <div className="flex items-center w-full">
                            {getTypeIcon(activeObjectType)}
                            <span className="truncate">{obj.id || obj.name}</span>
                          </div>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[300px] break-all">
                        <p className="text-xs">{obj.id || obj.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
                {filteredObjects.length === 0 && !loading[activeObjectType] && (
                  <div className="text-center py-4 text-muted-foreground">
                    未找到对象
                  </div>
                )}
              </div>
            </ScrollArea>
            {/* 添加分页控制 */}
            {pagination[activeObjectType].totalPages > 1 && (
              <div className="flex items-center justify-between p-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPage(activeObjectType, pagination[activeObjectType].page - 1)}
                  disabled={pagination[activeObjectType].page === 1}
                >
                  上一页
                </Button>
                <span className="text-sm text-muted-foreground">
                  {pagination[activeObjectType].page} / {pagination[activeObjectType].totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPage(activeObjectType, pagination[activeObjectType].page + 1)}
                  disabled={pagination[activeObjectType].page === pagination[activeObjectType].totalPages}
                >
                  下一页
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* 右侧内容面板 - 使用flex-1占据剩余空间 */}
        <div className="flex-1 min-w-0">
          {renderObjectDetails()}
        </div>
      </div>
    </div>
  );
}