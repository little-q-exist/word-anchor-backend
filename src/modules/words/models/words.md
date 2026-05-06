# 数据库模型文档：单词字典库 (Words)

## 表级别元数据
- **集合名称**：`words`
- **模型名称**：`Word`
- **配置项**：
  - 启用了虚拟字段支持 (`toJSON: { virtuals: true }`, `toObject: { virtuals: true }`)
- **虚拟字段**：
  - `learningData`: 关联查找当前单词在 `UserWord` 表中对应的学习状态数据（`localField: '_id', foreignField: 'wordId'`）

## 数据字典

### 主文档 (Word)

| 字段名 | 数据类型 | 约束条件 | 关联模型（外键） | 描述 |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | 主键，自动生成 | - | 单词实体唯一标识符 |
| `english` | String | `required: true`, `lowercase: true`, 被索引 (`index: true`), 去除首尾空格 (`trim: true`) | - | 英文单词原型（将强制转换为小写存储） |
| `phonetic` | String | `required: true` | - | 音标符号字符串 |
| `definitions` | Array\<Object> | `required: true`（自定义验证：长度必须大于0） | - | 释义数组（内嵌文档），至少包含一条释义记录 |
| `exampleSentence` | Array\<String> | `required: true` | - | 例句数组 |
| `related` | Array\<String> | 默认为空数组 | - | 相关词汇或同义词列表 |
| `tags` | Array\<String> | 默认为空数组，每个元素受限于枚举值集合 | - | 分类标签集，枚举值含：CET4, CET6, TOEFL, IELTS, GRE, 考研, 编程, 日常 |
| `createdBy` | ObjectId | `required: true` | `User` | 创建该单词记录的用户标识 |

### 子文档：释义表 (definitionSchema)

用于定义主文档中 `definitions` 数组的内部结构，反映一个单词的每一个具体释义和词性。

| 字段名 | 数据类型 | 约束条件 | 描述 |
| --- | --- | --- | --- |
| `_id` | ObjectId | 默认由数据库生成 | 该释义记录的内部标识符 |
| `meaning` | String | `required: true` | 释义内容（中文含义） |
| `partOfSpeech` | String | `required: true`, `enum: ['verb', 'noun', 'adjective', 'adverb', 'preposition']` | 该释义对应的词性（动词、名词、形容词、副词、介词等） |
