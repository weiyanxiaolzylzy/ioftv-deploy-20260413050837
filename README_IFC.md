# Python IFC 后端服务

## 安装依赖

```bash
pip install -r requirements.txt
```

## 启动服务

```bash
uvicorn app:app --port 8765 --reload
```

服务将运行在 `http://localhost:8765`

## API 接口

### 1. 提取构件编号映射

**POST** `/api/ifc/extract-marks`

请求体：
```json
{
  "filename": "教学楼4.13.ifc"
}
```

响应：
```json
{
  "success": true,
  "marks": {
    "33": "2505-TG-1",
    "128": "2505-WGCL-55"
  },
  "count": 1159
}
```

### 2. 批量提取构件列表

**POST** `/api/ifc/elements`

请求体：
```json
{
  "filename": "教学楼4.13.ifc",
  "limit": 8000
}
```

响应：
```json
{
  "success": true,
  "elements": [
    {
      "expressID": "33",
      "globalId": "0IWxLrfs1FnhAbgMcLGwmU",
      "type": "IFCELEMENTASSEMBLY",
      "name": "Steel Assembly",
      "componentMark": "2505-TG-1"
    }
  ],
  "total": 12345,
  "hasMarks": 1159,
  "truncated": false
}
```

### 3. 健康检查

**GET** `/health`

响应：
```json
{
  "status": "healthy"
}
```

## 测试

```bash
# 测试健康检查
curl http://localhost:8765/health

# 测试提取构件编号
curl -X POST http://localhost:8765/api/ifc/extract-marks \
  -H "Content-Type: application/json" \
  -d '{"filename": "教学楼4.13.ifc"}'

# 测试提取构件列表
curl -X POST http://localhost:8765/api/ifc/elements \
  -H "Content-Type: application/json" \
  -d '{"filename": "教学楼4.13.ifc", "limit": 100}'
```

## 技术栈

- FastAPI - Web 框架
- ifcopenshell - IFC 文件解析
- uvicorn - ASGI 服务器
- CORS 支持前端 http://localhost:5173

## 文件结构

```
.
├── app.py              # FastAPI 主程序
├── ifc_service.py      # IFC 解析服务
├── requirements.txt    # Python 依赖
└── server/uploads/ifc/ # IFC 文件目录
```
