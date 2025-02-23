export interface Question {
  id: string
  title: string
  description: string
  tags: string[]
  votes: number
  answers: number
  views: number
  timeAgo: string
}

export interface Tag {
  name: string
  count: number
  description?: string
}

export const mockQuestions: Question[] = [
  {
    id: "1",
    title: "如何在 Next.js 中实现 SSR？",
    description: "我正在尝试使用 Next.js 构建一个应用，但是对 SSR 的实现有些疑惑...",
    tags: ["next.js", "react", "ssr"],
    votes: 15,
    answers: 3,
    views: 128,
    timeAgo: "2小时前"
  },
  {
    id: "2",
    title: "TypeScript 中的泛型如何使用？",
    description: "想了解在 TypeScript 中泛型的最佳实践和常见用例...",
    tags: ["typescript", "泛型", "javascript"],
    votes: 32,
    answers: 8,
    views: 256,
    timeAgo: "1天前"
  },
  {
    id: "3",
    title: "React Server Components 的优势是什么？",
    description: "最近在学习 React Server Components，想了解它相比传统组件的优势...",
    tags: ["react", "rsc", "next.js"],
    votes: 24,
    answers: 5,
    views: 180,
    timeAgo: "3小时前"
  },
  {
    id: "4",
    title: "如何优化 React 应用的性能？",
    description: "我的 React 应用在处理大量数据时性能表现不佳，需要一些优化建议...",
    tags: ["react", "性能优化", "javascript"],
    votes: 45,
    answers: 12,
    views: 420,
    timeAgo: "5小时前"
  },
  {
    id: "5",
    title: "Tailwind CSS 和 CSS Modules 如何选择？",
    description: "在项目中纠结使用 Tailwind CSS 还是 CSS Modules，想听听大家的建议...",
    tags: ["css", "tailwind", "前端"],
    votes: 28,
    answers: 15,
    views: 380,
    timeAgo: "1天前"
  },
  {
    id: "6",
    title: "Vue3 的 Composition API 和 React Hooks 的区别",
    description: "想了解这两种方案在设计理念和使用方式上的主要区别...",
    tags: ["vue", "react", "javascript"],
    votes: 37,
    answers: 9,
    views: 290,
    timeAgo: "2天前"
  },
  {
    id: "7",
    title: "MongoDB 和 MySQL 的应用场景对比",
    description: "在选择数据库时，如何判断使用 MongoDB 还是 MySQL 更合适？",
    tags: ["数据库", "mongodb", "mysql"],
    votes: 41,
    answers: 14,
    views: 520,
    timeAgo: "4小时前"
  },
  {
    id: "8",
    title: "Docker 容器间的网络通信问题",
    description: "在使用 Docker Compose 时遇到了容器间网络通信的问题，求解决方案...",
    tags: ["docker", "网络", "容器"],
    votes: 19,
    answers: 6,
    views: 230,
    timeAgo: "1天前"
  },
  {
    id: "9",
    title: "GraphQL 相比 REST API 的优势在哪里？",
    description: "考虑将项目的 API 改造成 GraphQL，想了解它的优势和可能遇到的问题...",
    tags: ["graphql", "api", "后端"],
    votes: 33,
    answers: 11,
    views: 340,
    timeAgo: "6小时前"
  },
  {
    id: "10",
    title: "微前端架构的实践经验分享",
    description: "正在考虑采用微前端架构，想了解一下实际项目中的经验和坑...",
    tags: ["微前端", "架构", "前端"],
    votes: 56,
    answers: 18,
    views: 680,
    timeAgo: "2天前"
  },
  {
    id: "11",
    title: "Node.js 内存泄漏问题排查",
    description: "生产环境的 Node.js 应用出现内存泄漏，求排查和解决方案...",
    tags: ["node.js", "内存", "性能"],
    votes: 39,
    answers: 7,
    views: 410,
    timeAgo: "1天前"
  },
  {
    id: "12",
    title: "Flutter vs React Native 选择建议",
    description: "准备开发一个跨平台移动应用，对这两个框架的选择比较纠结...",
    tags: ["flutter", "react-native", "移动端"],
    votes: 47,
    answers: 16,
    views: 590,
    timeAgo: "3天前"
  },
  {
    id: "13",
    title: "Kubernetes 集群扩展性问题",
    description: "在 K8s 集群扩展时遇到了一些问题，特别是在负载均衡方面...",
    tags: ["kubernetes", "容器化", "运维"],
    votes: 29,
    answers: 8,
    views: 320,
    timeAgo: "12小时前"
  }
]

export const mockTags: Tag[] = [
  { 
    name: "javascript", 
    count: 1243,
    description: "JavaScript 是一种具有函数优先特性的轻量级、解释型或即时编译型的编程语言"
  },
  { 
    name: "react", 
    count: 856,
    description: "用于构建用户界面的 JavaScript 库"
  },
  { 
    name: "next.js", 
    count: 543,
    description: "基于 React 的全栈开发框架"
  },
  { 
    name: "typescript", 
    count: 432,
    description: "JavaScript 的超集，添加了类型系统"
  },
  { 
    name: "node.js", 
    count: 328,
    description: "基于 Chrome V8 引擎的 JavaScript 运行时"
  },
  { 
    name: "vue", 
    count: 287,
    description: "渐进式 JavaScript 框架"
  },
  { 
    name: "css", 
    count: 256,
    description: "层叠样式表语言"
  },
  { 
    name: "html", 
    count: 234,
    description: "超文本标记语言"
  }
] 