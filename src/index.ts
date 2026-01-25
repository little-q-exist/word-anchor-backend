import express from 'express';
const app = express();
app.use(express.json());

const PORT = 3000;

app.get('/', (_req, res) => {
  res.send('hello world!');
});

app.listen(PORT, () => {
  console.info(`Server is running at ${PORT}`);
});
