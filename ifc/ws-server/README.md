# IFC 查看器 WebSocket 中转服务

## 功能说明

这是一个简单的 WebSocket 中转服务，用于在**检测系统**和**IFC 网页查看器**之间传递消息。

## 快速开始

### 1. 安装依赖

```bash
cd ws-server
npm install
```

### 2. 启动服务

```bash
npm start
```

服务将在 `ws://localhost:8080` 监听。

## 消息格式

### 检测系统发送的消息

```json
{
  "action": "highlight",
  "globalId": "3X3r$U0nBWR$5Kz$mGRj$",
  "reason": "裂缝超限"
}
```

### 参数说明

| 参数 | 类型 | 说明 |
|------|------|------|
| action | string | 固定为 `highlight`，表示高亮构件 |
| globalId | string | IFC 构件的 GlobalId |
| reason | string | 检测原因（可选） |

## 集成示例

### Python

```python
import websocket
import json

def report_detection(global_id: str, reason: str):
    ws = websocket.create_connection("ws://localhost:8080")
    
    # 注册为检测系统
    ws.send(json.dumps({"type": "detection"}))
    
    # 发送检测结果
    ws.send(json.dumps({
        "action": "highlight",
        "globalId": global_id,
        "reason": reason
    }))
    
    ws.close()

# 使用示例
report_detection("3X3r$U0nBWR$5Kz$mGRj$", "裂缝超限")
```

### C#

```csharp
using WebSocketSharp;

var ws = new WebSocket("ws://localhost:8080");
ws.Connect();
ws.Send("{\"type\":\"detection\"}");
ws.Send("{\"action\":\"highlight\",\"globalId\":\"3X3r$\",\"reason\":\"裂缝超限\"}");
ws.Close();
```

## 注意事项

1. 中转服务需要和 IFC 查看器网页部署在同一台机器上（或网络互通）
2. 检测系统和网页端都需要能够访问 `ws://localhost:8080`
3. 服务会自动处理重连，但建议检测系统做好错误处理
