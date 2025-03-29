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
  AlertCircle, Code, Eye, BookOpen, Copy, Check, Search
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import Prism from 'prismjs';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-plsql';
import 'prismjs/themes/prism-tomorrow.css';
import { List, AutoSizer } from 'react-virtualized';
import { useTheme } from "next-themes";
import axios from "axios";
import { CopyButton } from "@/components/CopyButton";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";

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

// 修改代码高亮组件以支持主题和行号，并添加SQL变量识别
const CodeHighlighter = ({ code }: { code: string }) => {
  const preRef = useRef<HTMLPreElement>(null);
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // 添加SQL变量规则
    if (Prism.languages.sql) {
      // 添加变量标记规则
      Object.assign(Prism.languages.sql, {
        'global-variable': {
          pattern: /@@\w+/g,
          greedy: true
        },
        'variable': {
          pattern: /@\w+/g,
          greedy: true
        }
      });
    }

    if (preRef.current) {
      // 应用代码高亮
      Prism.highlightElement(preRef.current);
      
      // 代码高亮完成后创建行号
      setTimeout(() => {
        if (preRef.current && codeContainerRef.current) {
          // 清除之前可能存在的行号元素
          const existingLineNumbers = codeContainerRef.current.querySelector('.line-numbers-container');
          if (existingLineNumbers) {
            existingLineNumbers.remove();
          }
          
          // 计算代码行数
          const lines = code.split('\n');
          const lineCount = lines.length;
          
          // 创建行号容器
          const lineNumbersContainer = document.createElement('div');
          lineNumbersContainer.className = 'line-numbers-container';
          lineNumbersContainer.style.position = 'absolute';
          lineNumbersContainer.style.top = '0';
          lineNumbersContainer.style.left = '0';
          lineNumbersContainer.style.width = '2.5em';
          lineNumbersContainer.style.height = '100%';
          lineNumbersContainer.style.overflow = 'hidden';
          lineNumbersContainer.style.borderRight = '1px solid #666';
          lineNumbersContainer.style.backgroundColor = resolvedTheme === 'dark' ? '#1a1a1a' : '#f0f0f0';
          lineNumbersContainer.style.paddingTop = '0.4em';
          
          // 创建行号内容
          const lineNumbersContent = document.createElement('div');
          lineNumbersContent.style.textAlign = 'right';
          lineNumbersContent.style.paddingRight = '0.4em';
          lineNumbersContent.style.color = '#888';
          lineNumbersContent.style.fontSize = '0.85em';
          lineNumbersContent.style.lineHeight = '1.4';
          
          // 生成所有行号
          for (let i = 1; i <= lineCount; i++) {
            const lineNumber = document.createElement('div');
            lineNumber.textContent = i.toString();
            lineNumber.style.height = '1.4em';
            lineNumbersContent.appendChild(lineNumber);
          }
          
          lineNumbersContainer.appendChild(lineNumbersContent);
          codeContainerRef.current.appendChild(lineNumbersContainer);
          
          // 同步滚动处理
          const codeElement = preRef.current;
          codeElement.addEventListener('scroll', () => {
            if (lineNumbersContainer) {
              lineNumbersContainer.scrollTop = codeElement.scrollTop;
            }
          });
        }
      }, 10);
    }
  }, [code, resolvedTheme]);

  const themeClass = useMemo(() => {
    // 根据主题切换样式类
    return resolvedTheme === 'dark' ? 'prism-dark' : 'prism-light';
  }, [resolvedTheme]);

  // 添加自定义样式以覆盖Prism默认样式
  useEffect(() => {
    const style = document.createElement('style');
    // 根据主题设置样式
    if (resolvedTheme === 'dark') {
      style.innerHTML = `
        .prism-dark {
          background-color: #1e1e1e !important;
          color: #d4d4d4 !important;
          position: relative;
          padding-left: 3em !important;
          line-height: 1.4;
          overflow: auto;
          max-height: 100%;
          font-family: 'Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', monospace !important;
        }
        .prism-dark .token.comment { color: #6a9955 !important; }
        .prism-dark .token.keyword { color: #569cd6 !important; }
        .prism-dark .token.string { color: #ce9178 !important; }
        .prism-dark .token.function { color: #dcdcaa !important; }
        .prism-dark .token.punctuation { color: #d4d4d4 !important; }
        .prism-dark .token.operator { color: #d4d4d4 !important; }
        .prism-dark .token.number { color: #b5cea8 !important; }
        .prism-dark .token.variable { color: #9cdcfe !important; }
        .prism-dark .token.global-variable { color: #f8c555 !important; font-weight: bold; }
      `;
    } else {
      style.innerHTML = `
        .prism-light {
          background-color: #f5f5f5 !important;
          color: #333 !important;
          position: relative;
          padding-left: 3em !important;
          line-height: 1.4;
          overflow: auto;
          max-height: 100%;
          font-family: 'Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', monospace !important;
        }
        .prism-light .token.comment { color: #008000 !important; }
        .prism-light .token.keyword { color: #0000ff !important; }
        .prism-light .token.string { color: #a31515 !important; }
        .prism-light .token.function { color: #795e26 !important; }
        .prism-light .token.punctuation { color: #333 !important; }
        .prism-light .token.operator { color: #000 !important; }
        .prism-light .token.number { color: #098658 !important; }
        .prism-light .token.variable { color: #0070c1 !important; }
        .prism-light .token.global-variable { color: #e36209 !important; font-weight: bold; }
      `;
    }
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, [resolvedTheme]);

  return (
    <div ref={codeContainerRef} className="relative" style={{height: '100%', minHeight: '300px'}}>
      <pre ref={preRef} className={`language-sql ${themeClass}`} style={{fontSize: '0.9em', maxHeight: '100%', overflow: 'auto', margin: 0, padding: '0.5em 0.5em 0.5em 3em'}}>
        <code>{code}</code>
      </pre>
    </div>
  );
};

// 搜索组件 - 使用内部状态完全隔离
const SearchBox = ({ onSearch }: { onSearch: (term: string) => void }) => {
  const [inputValue, setInputValue] = useState("");
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  
  const handleSearch = () => {
    if (inputValue.trim()) {
      onSearch(inputValue.trim());
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };
  
  return (
    <div className="mb-2">
      <div className="flex items-center space-x-1">
        <Input
          type="text"
          placeholder="输入关键词模糊搜索..."
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full h-7 text-xs"
        />
        <Button 
          size="sm" 
          className="h-7 px-2" 
          onClick={handleSearch}
        >
          <Search className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export default function DatabaseStructurePage() {
  // 数据库对象类型
  const [activeObjectType, setActiveObjectType] = useState<string>("tables");
  // 所有数据库对象
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

  // 过滤后的显示对象
  const [filteredObjects, setFilteredObjects] = useState<(DbTable | DbRoutine)[]>([]);
  // 当前选中的对象
  const [activeObject, setActiveObject] = useState<string>("");
  // 搜索条件
  const [searchTerm, setSearchTerm] = useState<string>("");
  const searchRef = useRef<string>("");
  // 加载状态
  const [loading, setLoading] = useState<{[key: string]: boolean}>({
    tables: false,
    views: false,
    procedures: false,
    functions: false
  });
  // 错误信息
  const [error, setError] = useState<string | null>(null);
  // 对象已加载标志
  const [objectsLoaded, setObjectsLoaded] = useState<{[key: string]: boolean}>({
    tables: false,
    views: false,
    procedures: false,
    functions: false
  });
  // 复制按钮状态
  const [copying, setCopying] = useState<{[key: string]: boolean}>({});
  // 添加详情加载状态
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // 添加分页状态
  const [pagination, setPagination] = useState<{[key: string]: PaginationInfo}>({
    tables: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
    views: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
    procedures: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
    functions: { total: 0, page: 1, pageSize: 20, totalPages: 0 }
  });
  
  // 加载状态
  const [isLoading, setIsLoading] = useState(false);

  // 添加搜索状态管理
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // 获取对象类型显示名称
  const getObjectTypeName = (type: string): string => {
    switch(type) {
      case "tables": return "表结构";
      case "views": return "视图";
      case "procedures": return "存储过程";
      case "functions": return "函数";
      default: return "数据库对象";
    }
  };

  // 获取当前类型的图标
  const getTypeIcon = (type: string, className: string = "h-5 w-5") => {
    switch(type) {
      case "tables": return <Table2 className={className} />;
      case "views": return <Eye className={className} />;
      case "procedures": return <BookOpen className={className} />;
      case "functions": return <Code className={className} />;
      default: return <Database className={className} />;
    }
  };
  
  // 加载数据页面函数
  const loadPage = useCallback(async (type: string, page: number = 1, searchTerm: string = "") => {
    if (isLoading) return;
    
    setIsLoading(true);
    setLoading(prev => ({...prev, [type]: true}));
    
    try {
      // 构建API URL
      let apiUrl = `/api/services/database/${type}?page=${page}&pageSize=20`;
      
      // 添加搜索条件 - 使用模糊查询参数，不需要在前端处理大小写
      if (searchTerm) {
        // 使用search参数实现模糊查询
        apiUrl += `&search=${encodeURIComponent(searchTerm)}&ignoreCase=true`;
      }
      
      // 对于表和视图，第一页或搜索时加载列信息
      // 对于存储过程和函数，只获取基本信息，详情按需加载
      const includeColumns = (type === 'tables' || type === 'views') && (page === 1 || searchTerm) ? true : false;
      if (includeColumns) {
        apiUrl += `&includeColumns=true`;
      }
      
      // 打印实际API请求URL
      console.log(`数据库查询API: ${apiUrl}`);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }
      
      const data = await response.json();
      
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
            // 确保数据不重复且类型正确
            const uniqueTables = data.tables.filter((table: DbTable, index: number, self: DbTable[]) =>
              index === self.findIndex((t: DbTable) => t.name === table.name)
            );
            
            if (page === 1) {
              // 第一页，替换现有数据
              setDbObjects(prev => ({...prev, tables: uniqueTables}));
              
              // 如果有数据且未选择对象，选择第一个
              if (uniqueTables.length > 0 && (!activeObject || activeObjectType !== "tables")) {
                setActiveObject(uniqueTables[0].name);
              }
              
              // 更新过滤的表
              if (activeObjectType === "tables") {
                setFilteredObjects(uniqueTables);
              }
            } else {
              // 追加数据（确保不重复）
              setDbObjects(prev => {
                const allTables = [...prev.tables];
                uniqueTables.forEach((table: DbTable) => {
                  if (!allTables.some(t => t.name === table.name)) {
                    allTables.push(table);
                  }
                });
                return {...prev, tables: allTables};
              });
              
              // 更新过滤列表
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
      
      // 设置已加载标志
      setObjectsLoaded(prev => ({...prev, [type]: true}));
      
      // 搜索完成后重置搜索状态
      if (searchTerm) {
        setIsSearching(false);
      }
      
    } catch (error) {
      console.error(`获取${getObjectTypeName(type)}失败:`, error);
      setError(error instanceof Error ? error.message : "未知错误");
      setIsSearching(false);
    } finally {
      setLoading(prev => ({...prev, [type]: false}));
      setIsLoading(false);
    }
  }, [isLoading, activeObject, activeObjectType, getObjectTypeName]);

  // 获取当前选中对象的数据
  const getActiveObjectData = useCallback(() => {
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
  }, [activeObject, activeObjectType, dbObjects]);

  // 加载表结构详情
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

  // 处理对象点击事件
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

  // 执行搜索
  const handleSearch = useCallback((term: string) => {
    console.log("执行模糊搜索:", term);
    setIsSearching(true);
    // 不需要转换大小写，保持原始输入，让API处理不区分大小写的搜索
    loadPage(activeObjectType, 1, term);
  }, [activeObjectType, loadPage]);

  // 修改实现视图过滤和搜索的Effect，修复循环请求问题
  useEffect(() => {
    // 如果搜索条件没有变化，则不重新执行搜索
    if (searchRef.current === searchTerm) return;
    
    // 更新搜索引用值，防止重复搜索
    searchRef.current = searchTerm;
    
    if (objectsLoaded[activeObjectType]) {
      setIsSearching(true);
      
      // 搜索逻辑 - 实现防抖
      const timer = setTimeout(() => {
        const activeObjects = dbObjects[activeObjectType as keyof typeof dbObjects];
        const filtered = activeObjects.filter((obj: DbTable | DbRoutine) => {
          // 模糊匹配名称 - 确保不区分大小写
          const objName = obj.name.toLowerCase();
          const searchLower = searchTerm.toLowerCase();
          
          // 检查名称是否包含搜索词（不区分大小写）
          return objName.includes(searchLower);
        });
        
        setFilteredObjects(filtered);
        setIsSearching(false);
      }, 300); // 设置300ms的防抖延迟
      
      return () => clearTimeout(timer);
    } else {
      setFilteredObjects([]);
    }
  }, [activeObjectType, dbObjects, objectsLoaded, searchTerm]);
  
  // 当对象类型变化时重置搜索条件
  useEffect(() => {
    // 只有当搜索词非空时才重置，避免不必要的渲染
    if (searchTerm) {
      setSearchTerm("");
      searchRef.current = "";
    }
  }, [activeObjectType]);

  // 处理加载完成后的状态更新
  useEffect(() => {
    if (!loading[activeObjectType] && isSearching) {
      setIsSearching(false);
    }
  }, [loading, activeObjectType, isSearching]);

  // 修改activeObjectType变化时的处理
  useEffect(() => {
    // 当切换对象类型时，重置搜索条件
    if (searchTerm) {
      setSearchTerm("");
      searchRef.current = "";
    }
    
    // 如果对象类型已加载，显示对应的过滤对象
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
      }
    } else if (!loading[activeObjectType] && !isLoading) {
      // 对象类型未加载，加载第一页数据
      loadPage(activeObjectType, 1);
    }
  }, [activeObjectType, dbObjects, objectsLoaded, loading, isLoading]);

  // 复制表/视图创建SQL到剪贴板
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
  
  // 复制字段的ALTER ADD语句到剪贴板
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

  // 优化虚拟列表渲染，修复虚拟列表高度和样式问题
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
                rowHeight={30} // 减小行高
                overscanRowCount={10}
                rowRenderer={({ index, style, key }: { index: number; key: string; style: React.CSSProperties }) => {
                  const obj = filteredObjects[index];
                  const isActive = activeObject === obj.name;
                  
                  return (
                    <div 
                      key={key || `${activeObjectType}-${obj.name}-${index}`}
                      style={{...style, padding: '0 2px'}}
                    >
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
                            <span className="text-xs">{obj.name}</span>
                          </div>
                          <div 
                            className={`${isActive ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 transition-opacity`}
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
  }, [activeObject, activeObjectType, filteredObjects, isLoading, loading, pagination, copying, loadPage, searchTerm, handleObjectClick, copyCreateSql, getObjectTypeName]);

  // 渲染对象详情面板
  const renderObjectDetails = useCallback(() => {
    const activeData = getActiveObjectData();
    
    if (!activeData) {
      return (
        <Card className="border-dashed">
          <CardContent className="pt-4">
            <div className="flex flex-col items-center justify-center py-6 text-center">
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
        <Card>
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
                    className="p-1 rounded hover:bg-muted transition-colors"
                    onClick={() => copyCreateSql(activeObjectType, tableData.name)}
                    disabled={!!copying[tableData.name]}
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
              <div className="overflow-auto max-h-[calc(100vh-240px)]">
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
        <Card className="h-full">
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
              <div className="overflow-hidden max-h-[calc(100vh-140px)]">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>加载代码中...</span>
                  </div>
                ) : routineData.definition ? (
                  <div className="h-[calc(100vh-140px)]">
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
  }, [activeObjectType, getActiveObjectData, copying, copyCreateSql, copyAlterAddSql, detailLoading, getObjectTypeName]);

  return (
    <div className="container mx-auto py-0 px-0">
      <Toaster />
      
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-1">
        {/* 左侧控制面板 - 调整布局比例减小 */}
        <div className="lg:col-span-1">
          <div className="space-y-2">
            <Card className="overflow-hidden">
              <CardHeader className="py-1 px-2">
                <div className="w-full">
                  {/* 使用自包含搜索组件 */}
                  <SearchBox onSearch={handleSearch} />
                  
                  {/* 对象类型选择 - 调整按钮布局避免内容溢出 */}
                  <div className="grid grid-cols-4 gap-1">
                    <Button 
                      variant={activeObjectType === "tables" ? "default" : "outline"}
                      className="flex items-center justify-center py-1 px-1 text-[9px] h-6 w-full"
                      onClick={() => setActiveObjectType("tables")}
                    >
                      <Table2 className="h-2.5 w-2.5 mr-0.5 flex-shrink-0" />
                      <span className="truncate">表</span>
                    </Button>
                    
                    <Button 
                      variant={activeObjectType === "views" ? "default" : "outline"}
                      className="flex items-center justify-center py-1 px-1 text-[9px] h-6 w-full"
                      onClick={() => setActiveObjectType("views")}
                    >
                      <Eye className="h-2.5 w-2.5 mr-0.5 flex-shrink-0" />
                      <span className="truncate">视图</span>
                    </Button>
                    
                    <Button 
                      variant={activeObjectType === "procedures" ? "default" : "outline"}
                      className="flex items-center justify-center py-1 px-1 text-[9px] h-6 w-full"
                      onClick={() => setActiveObjectType("procedures")}
                      title="存储过程"
                    >
                      <BookOpen className="h-2.5 w-2.5 mr-0.5 flex-shrink-0" />
                      <span className="truncate">过程</span>
                    </Button>
                    
                    <Button 
                      variant={activeObjectType === "functions" ? "default" : "outline"}
                      className="flex items-center justify-center py-1 px-1 text-[9px] h-6 w-full"
                      onClick={() => setActiveObjectType("functions")}
                    >
                      <Code className="h-2.5 w-2.5 mr-0.5 flex-shrink-0" />
                      <span className="truncate">函数</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <div className="space-y-2">
                  <Button 
                    onClick={() => loadPage(activeObjectType, 1)} 
                    disabled={loading[activeObjectType]}
                    className="w-full h-7 text-xs"
                    variant={objectsLoaded[activeObjectType] ? "outline" : "default"}
                  >
                    {loading[activeObjectType] ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        <span className="text-xs">加载中...</span>
                      </>
                    ) : objectsLoaded[activeObjectType] ? (
                      <>
                        {getTypeIcon(activeObjectType, "h-3 w-3 mr-1")}
                        <span className="text-xs">刷新{getObjectTypeName(activeObjectType)}</span>
                      </>
                    ) : (
                      <>
                        {getTypeIcon(activeObjectType, "h-3 w-3 mr-1")}
                        <span className="text-xs">查询{getObjectTypeName(activeObjectType)}</span>
                      </>
                    )}
                  </Button>
                  
                  {/* 显示信息 */}
                  <div className="text-xs text-muted-foreground">
                    {filteredObjects.length} / {pagination[activeObjectType].total} 个
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* 对象列表 */}
            {objectsLoaded[activeObjectType] && (
              <Card className="h-full overflow-hidden">
                <CardHeader className="pb-1 pt-1 px-3">
                  <div className="flex items-center">
                    {getTypeIcon(activeObjectType, "h-3 w-3 mr-1")}
                    <span className="text-xs font-medium">{getObjectTypeName(activeObjectType)}</span>
                  </div>
                </CardHeader>
                <CardContent className="p-1">
                  {renderVirtualList()}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        
        {/* 右侧详情显示 - 增加宽度比例 */}
        <div className="lg:col-span-5">
          {error && (
            <Alert variant="destructive" className="mb-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>获取数据失败</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {renderObjectDetails()}
        </div>
      </div>
    </div>
  );
}