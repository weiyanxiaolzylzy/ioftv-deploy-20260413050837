/**
 * WebSocket 中转服务
 * 
 * 作用：作为检测系统和 IFC 网页查看器之间的通信桥梁
 * 
 * 检测系统连接: ws://localhost:8080 (作为客户端连接)
 * 网页端连接: ws://localhost:8080 (作为客户端连接)
 * 
 * 使用方法:
 * 1. npm install
 * 2. npm start
 */

import { WebSocketServer } from 'ws';

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

// 存储连接的客户端
const clients = {
    detection: null,  // 检测系统
    viewer: null     // IFC 查看器网页
};

console.log(`WebSocket 中转服务已启动，监听端口 ${PORT}`);

wss.on('connection', (ws, req) => {
    const clientIP = req.socket.remoteAddress;
    console.log(`新连接来自: ${clientIP}`);

    // 简单的心跳检测，每30秒发送一次 ping
    const pingInterval = setInterval(() => {
        if (ws.isAlive === false) {
            clearInterval(pingInterval);
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    }, 30000);

    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log('收到消息:', message);

            // 识别客户端类型
            if (message.type === 'detection') {
                // 检测系统连接
                clients.detection = ws;
                console.log('检测系统已连接');
                ws.send(JSON.stringify({ type: 'connected', message: '已连接到中转服务' }));
            } else if (message.type === 'viewer') {
                // 网页端连接
                clients.viewer = ws;
                console.log('IFC 查看器已连接');
                ws.send(JSON.stringify({ type: 'connected', message: '已连接到中转服务' }));
            } else if (message.action === 'highlight') {
                // 检测系统发来的高亮请求，转发给网页端
                if (clients.viewer && clients.viewer.readyState === 1) {
                    clients.viewer.send(JSON.stringify(message));
                    console.log('已转发高亮请求到查看器');
                } else {
                    console.warn('网页端未连接，无法转发');
                    ws.send(JSON.stringify({ type: 'error', message: '网页端未连接' }));
                }
            } else if (message.action === 'status') {
                // 查询状态
                ws.send(JSON.stringify({
                    type: 'status',
                    viewerConnected: clients.viewer !== null && clients.viewer.readyState === 1,
                    detectionConnected: clients.detection !== null && clients.detection.readyState === 1
                }));
            }
        } catch (e) {
            console.error('解析消息失败:', e);
        }
    });

    ws.on('close', () => {
        clearInterval(pingInterval);
        // 清除断开连接的客户端
        if (clients.detection === ws) {
            clients.detection = null;
            console.log('检测系统已断开');
        }
        if (clients.viewer === ws) {
            clients.viewer = null;
            console.log('网页端已断开');
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket 错误:', error);
    });
});

// ============================================================
// 检测系统调用示例（供参考）
// ============================================================
//
// Python 示例:
// ```python
// import websocket
// import json
//
// def report_detection(global_id: str, reason: str):
//     ws = websocket.create_connection("ws://localhost:8080")
//     # 注册为检测系统
//     ws.send(json.dumps({"type": "detection"}))
//     # 发送检测结果
//     ws.send(json.dumps({
//         "action": "highlight",
//         "globalId": global_id,
//         "reason": reason
//     }))
//     ws.close()
// ```
//
// C# 示例:
// ```csharp
// using WebSocketSharp;
//
// var ws = new WebSocket("ws://localhost:8080");
// ws.Connect();
// ws.Send("{\"type\":\"detection\"}");
// ws.Send("{\"action\":\"highlight\",\"globalId\":\"3X3r$\",\"reason\":\"裂缝超限\"}");
// ws.Close();
// ```
//
// Node.js 示例:
// ```javascript
// const WebSocket = require('ws');
// const ws = new WebSocket('ws://localhost:8080');
// ws.on('open', () => {
//     ws.send(JSON.stringify({ type: 'detection' }));
//     ws.send(JSON.stringify({
//         action: 'highlight',
//         globalId: '3X3r$U0nBWR$5Kz$mGRj$',
//         reason: '裂缝超限'
//     }));
// });
// ws.close();
// ```
