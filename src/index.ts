import app from './server.js';

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, (): void => {
  console.log(`Server is running on port ${PORT}`);
});

