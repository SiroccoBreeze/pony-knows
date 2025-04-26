# Office 文档在线预览解决方案

本项目使用Microsoft Office Web Viewer和Google Docs Viewer实现在线预览Office文档的功能。

## 自动备选解决方案

我们的预览组件自动提供两种在线预览服务：

1. **Microsoft Office Web Viewer** - 默认用于大多数Office文档
2. **Google Docs Viewer** - 默认用于Excel文件，也可作为备选方案

系统会根据文件类型自动选择最合适的预览服务，您也可以随时手动切换查看器。

## Microsoft Office Web Viewer

Microsoft提供的免费服务，允许在浏览器中查看Office文档。它通过以下URL格式工作：

```
https://view.officeapps.live.com/op/view.aspx?src=YOUR_FILE_URL
```

### 已知问题

Microsoft Office Web Viewer在预览某些Excel文件时可能会出现错误："We're sorry, but for some reason we can't open this for you."（很抱歉，由于某种原因我们无法为您打开此文件）。这是微软服务的限制，我们使用Google Docs Viewer作为Excel文件的默认查看器来解决此问题。

## Google Docs Viewer

Google提供的文档预览服务，通过以下URL格式工作：

```
https://docs.google.com/viewer?url=YOUR_FILE_URL&embedded=true
```

Google Docs Viewer对Excel文件的支持更好，但加载速度可能较慢。

## 使用限制与要求

1. **文件必须公开可访问**：两种服务都需要能够从互联网访问您的文件URL
2. **文件大小限制**：通常限制为10MB以下
3. **支持的文件格式**：
   - Word: .docx, .doc, .dotx, .dotm, .dot
   - Excel: .xlsx, .xls, .xlsb, .xlsm, .csv
   - PowerPoint: .pptx, .ppt, .ppsx, .pps, .potx, .potm, .pot
   - 其他: .pdf (仅预览)

4. **使用场景**：这些服务主要适用于预览，不适合敏感文档

## 查看器切换功能

我们的预览界面提供查看器切换功能：

1. 界面右上角有"切换至Google/Microsoft查看器"按钮
2. 如果当前查看器加载失败，您可以点击重试按钮尝试使用另一个查看器

## 故障排除

如果在预览文档时遇到问题：

1. **尝试切换查看器**：如果一个查看器失败，尝试切换到另一个
2. **检查文件URL是否可公开访问**：确保查看器服务可以访问您的文件
3. **文件格式检查**：确保文件格式受支持
4. **文件大小**：检查文件是否超过大小限制
5. **CORS问题**：确保您的服务器允许跨域请求
6. **下载查看**：如果在线预览都失败，可以下载文件本地查看

## 隐私和安全考虑

使用这些在线预览服务时，您的文档会被发送到Microsoft或Google的服务器进行处理和渲染。如果您处理敏感信息，请考虑：

1. 实施访问控制，确保只有授权用户可以获取用于生成预览URL的链接
2. 考虑为文档URL添加有效期限制
3. 对于高度敏感的文档，考虑使用自托管解决方案

## 自托管替代方案

如果需要更高的安全性和自定义功能，可以考虑自托管解决方案如ONLYOFFICE Document Server。

## 参考资料

- [Microsoft Office Web Viewer文档](https://support.microsoft.com/zh-cn/office/使用-office-web-viewer-查看-office-文件-1cc2d9d3-8e5b-4f58-8105-43885e324021)
- [Office Web Viewer支持的文件格式](https://support.microsoft.com/zh-cn/office/web-浏览器中的-office-文件格式支持-0943ff2c-6014-4e75-a016-149d53e6d1bb) 