# 数据库模型文档：用户单词学习数据 (UserWords)

## 表级别元数据
- **集合名称**：`userwords`
- **模型名称**：`UserWord`
- **索引设计**：
  - 联合唯一索引：`{ userId: 1, wordId: 1 }`，确保每个用户对于每个单词只有一条学习记录。

## 数据字典

| 字段名 | 数据类型 | 约束条件 | 关联模型（外键） | 描述 |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | 主键，自动生成 | - | 记录唯一标识符 |
| `userId` | ObjectId | `required: true` | `User` | 获取此记录的所属用户标识 |
| `wordId` | ObjectId | `required: true` | `Word` | 关联目标单词的字典库标识 |
| `english` | String | `required: true` | - | 冗余字段：英文单词原型，方便快速查询 |
| `easeFactor` | Number | `required: true`, `default: 2.5` | - | SM-2 算法中的难度系数 (E-Factor) |
| `lastLearned` | String | 选填 | - | 最近一次学习时间的字符串记录（通常为 ISO 格式时间） |
| `interval` | Number | `required: true`, `default: 0` | - | 下次复习的间隔天数 |
| `dueDate` | String | 选填 | - | 计算得出的下次复习截止日期字符串记录 |
| `repetition` | Number | `required: true`, `default: 0` | - | 连续正确回忆次数计数器 |
| `favorited` | Boolean | `required: true`, `default: false` | - | 是否被用户标记为收藏 |
