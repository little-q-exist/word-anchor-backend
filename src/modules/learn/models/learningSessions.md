# 数据库模型文档：用户会话 (LearningSessions)

## 表级别元数据
- **集合名称**：`learningsessions`
- **模型名称**：`LearningSession`
- **索引设计**：
  - 联合唯一索引：`{ userId: 1, mode: 1 }`，确保每个用户在每种学习模式下只有一个活动的会话。
- **配置项**：
  - `timestamps: true`（自动维护 `createdAt` 和 `updatedAt` 时间戳字段）

## 数据字典

### 主文档 (LearningSessionState)

| 字段名 | 数据类型 | 约束条件 | 关联模型（外键） | 描述 |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | 主键，自动生成 | - | 会话唯一标识符 |
| `userId` | ObjectId | `required: true` | `User` | 关联用户的唯一标识符 |
| `mode` | String | `required: true`, `enum: ['learn', 'review']` | - | 学习模式（分为学习和复习） |
| `words` | Array\<Object> | `required: true`, `default: []` | - | 本次会话涉及的单词状态列表（内嵌文档） |
| `queueSnapshot` | Object | `required: true` | - | 会话进度与队列快照（内嵌文档） |
| `version` | Number | `required: true`, `default: 1` | - | 会话状态版本控制，用于并发更新控制 |
| `updatedByDevice` | String | 选填 | - | 最后更新此会话的设备标识 |
| `createdAt` | Date | 自动生成 | - | 记录创建时间 |
| `updatedAt` | Date | 自动生成 | - | 记录最后更新时间 |

### 子文档：单词状态表 (sessionWordSchema)

用于记录主文档中 `words` 数组内每个单词的状态。

| 字段名 | 数据类型 | 约束条件 | 描述 |
| --- | --- | --- | --- |
| `_id` | String | `required: true`，禁用默认生成 | 单词映射标识 |
| `english` | String | `required: true` | 英文单词原型 |
| `status` | String | `required: true`, `enum: ['idle', 'passed', 'failed']` | 单词在当前会话中的学习状态 |

### 子文档：队列快照表 (sessionQueueSnapshotSchema)

用于记录主文档中 `queueSnapshot` 字段的具体内容。

| 字段名 | 数据类型 | 约束条件 | 描述 |
| --- | --- | --- | --- |
| `index` | Number | `required: true` | 当前学习队列执行索引位置 |
| `isRepeating` | Boolean | `required: true` | 当前是否处于错误重学循环状态 |
| `repeatQueue` | Array\<Number> | `required: true`, `default: []` | 需要重学的单词索引队列 |
| `updatedAt` | Number | `required: true` | 队列快照生成时的时间戳 |
