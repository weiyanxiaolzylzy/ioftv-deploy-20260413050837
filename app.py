from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ifc_service import IFCService
import os

app = FastAPI(title="IFC Backend Service", version="1.0.0")

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化 IFC 服务
ifc_service = IFCService(base_path="server/uploads/ifc")


class ExtractMarksRequest(BaseModel):
    filename: str


class ExtractElementsRequest(BaseModel):
    filename: str
    limit: int = 8000


@app.get("/")
async def root():
    return {"message": "IFC Backend Service", "version": "1.0.0"}


@app.post("/api/ifc/extract-marks")
async def extract_marks(request: ExtractMarksRequest):
    """
    从 IFC 文件提取构件编号映射
    """
    try:
        marks = ifc_service.extract_component_marks(request.filename)
        return {
            "success": True,
            "marks": marks,
            "count": len(marks)
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"解析失败: {str(e)}")


class BuildIndexRequest(BaseModel):
    filename: str
    limit: int = 8000


@app.post("/api/ifc/elements")
async def extract_elements(request: ExtractElementsRequest):
    """
    批量提取构件列表
    """
    try:
        result = ifc_service.extract_elements(request.filename, request.limit)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"解析失败: {str(e)}")


@app.post("/api/ifc/build-index")
async def build_index(request: BuildIndexRequest):
    """
    合并接口：一次性返回构件编号映射和构件列表（供前端 buildElementIndex 使用）
    """
    try:
        result = ifc_service.build_index(request.filename, request.limit)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"解析失败: {str(e)}")


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8765)
