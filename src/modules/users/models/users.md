# 数据库模型文档：用户表 (Users)

## 表级别元数据
- **集合名称**：`users`
- **模型名称**：`User`

## 数据字典

| 字段名 | 数据类型 | 约束条件 | 描述 |
| --- | --- | --- | --- |
| `_id` | ObjectId | 主键，自动生成 | 用户唯一标识符 |
| `username` | String | `required: true`, 唯一 (`unique: true`), 添加索引 (`index: true`) | 用户名，系统内不可重复 |
| `email` | String | 选填 | 用户的电子邮件地址 |
| `passwordHash` | String | `required: true`, `select: false` | 加密后的密码散列值，查询时默认不返回以保证安全 |
| `isAdmin` | Boolean | `required: true`, `default: false` | 是否为系统管理员权限 |
