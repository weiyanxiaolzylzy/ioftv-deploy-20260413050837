import ifcopenshell
from typing import Dict, List, Optional
import os


class IFCService:
    """IFC 文件解析服务"""

    def __init__(self, base_path: str = "server/uploads/ifc"):
        self.base_path = base_path

    def get_file_path(self, filename: str) -> str:
        """获取 IFC 文件完整路径"""
        return os.path.join(self.base_path, filename)

    def extract_component_marks(self, filename: str) -> Dict[str, str]:
        """
        提取构件编号映射
        返回: {expressID: componentMark}
        """
        file_path = self.get_file_path(filename)
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"IFC 文件不存在: {filename}")

        ifc_file = ifcopenshell.open(file_path)
        marks = {}

        # 获取所有 IFCRELDEFINESBYPROPERTIES 关系
        rel_defines = ifc_file.by_type("IFCRELDEFINESBYPROPERTIES")

        for rel in rel_defines:
            # 获取属性集
            prop_def = rel.RelatingPropertyDefinition
            if not hasattr(prop_def, 'HasProperties'):
                continue

            # 查找 Assembly/Cast unit Mark 属性
            component_mark = None
            for prop in prop_def.HasProperties:
                if hasattr(prop, 'Name') and prop.Name == 'Assembly/Cast unit Mark':
                    if hasattr(prop, 'NominalValue') and prop.NominalValue:
                        component_mark = prop.NominalValue.wrappedValue
                        break

            # 关联到所有相关构件
            if component_mark:
                for entity in rel.RelatedObjects:
                    marks[str(entity.id())] = component_mark

        return marks

    def extract_elements(self, filename: str, limit: int = 8000) -> Dict:
        """
        批量提取构件列表
        """
        file_path = self.get_file_path(filename)
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"IFC 文件不存在: {filename}")

        ifc_file = ifcopenshell.open(file_path)

        # 先构建 expressID -> componentMark 映射
        marks_map = {}
        rel_defines = ifc_file.by_type("IFCRELDEFINESBYPROPERTIES")

        for rel in rel_defines:
            prop_def = rel.RelatingPropertyDefinition
            if not hasattr(prop_def, 'HasProperties'):
                continue

            component_mark = None
            for prop in prop_def.HasProperties:
                if hasattr(prop, 'Name') and prop.Name == 'Assembly/Cast unit Mark':
                    if hasattr(prop, 'NominalValue') and prop.NominalValue:
                        component_mark = prop.NominalValue.wrappedValue
                        break

            if component_mark:
                for entity in rel.RelatedObjects:
                    marks_map[entity.id()] = component_mark

        # 提取构件列表
        elements = []
        element_types = [
            "IFCELEMENTASSEMBLY",
            "IFCBEAM",
            "IFCCOLUMN",
            "IFCSLAB",
            "IFCWALL",
            "IFCMEMBER"
        ]

        all_elements = []
        for elem_type in element_types:
            all_elements.extend(ifc_file.by_type(elem_type))

        total = len(all_elements)
        has_marks = 0
        truncated = total > limit

        for element in all_elements[:limit]:
            express_id = str(element.id())
            component_mark = marks_map.get(element.id(), "")

            if component_mark:
                has_marks += 1

            elements.append({
                "expressID": express_id,
                "globalId": element.GlobalId if hasattr(element, 'GlobalId') else "",
                "type": element.is_a(),
                "name": element.Name if hasattr(element, 'Name') else "",
                "componentMark": component_mark
            })

        return {
            "success": True,
            "elements": elements,
            "total": total,
            "hasMarks": has_marks,
            "truncated": truncated
        }

    def build_index(self, filename: str, limit: int = 8000) -> Dict:
        """
        合并提取构件编号映射 + 构件列表（供前端 buildElementIndex 使用）
        前端会额外在浏览器里过滤有几何的构件并检查 ObjectPlacement / Representation
        """
        file_path = self.get_file_path(filename)
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"IFC 文件不存在: {filename}")

        ifc_file = ifcopenshell.open(file_path)

        # 第一步：提取构件编号映射
        marks = {}
        rel_defines = ifc_file.by_type("IFCRELDEFINESBYPROPERTIES")
        for rel in rel_defines:
            prop_def = rel.RelatingPropertyDefinition
            if not hasattr(prop_def, 'HasProperties'):
                continue
            component_mark = None
            for prop in prop_def.HasProperties:
                if hasattr(prop, 'Name') and prop.Name == 'Assembly/Cast unit Mark':
                    if hasattr(prop, 'NominalValue') and prop.NominalValue:
                        component_mark = prop.NominalValue.wrappedValue
                        break
            if component_mark:
                for entity in rel.RelatedObjects:
                    marks[str(entity.id())] = component_mark

        # 第二步：提取构件列表
        elements = []
        element_types = [
            "IFCELEMENTASSEMBLY",
            "IFCBEAM",
            "IFCCOLUMN",
            "IFCSLAB",
            "IFCWALL",
            "IFCMEMBER"
        ]
        all_elements = []
        for elem_type in element_types:
            all_elements.extend(ifc_file.by_type(elem_type))

        total = len(all_elements)
        has_marks = 0
        truncated = total > limit

        for element in all_elements[:limit]:
            express_id = str(element.id())
            component_mark = marks.get(express_id, "")

            if component_mark:
                has_marks += 1

            elements.append({
                "expressID": express_id,
                "globalId": element.GlobalId if hasattr(element, 'GlobalId') else "",
                "type": element.is_a(),
                "name": element.Name if hasattr(element, 'Name') else "",
                "componentMark": component_mark
            })

        return {
            "success": True,
            "marks": marks,
            "elements": elements,
            "total": total,
            "hasMarks": has_marks,
            "truncated": truncated
        }
