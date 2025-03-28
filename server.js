const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Rota principal para a API
app.post('/api/kwai', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ 
                success: false, 
                message: 'URL não fornecida' 
            });
        }

        // Verificar se a URL é do Kwai
        if (!url.includes('kwai.com') && !url.includes('kwai.app') && !url.includes('kw.ai')) {
            return res.status(400).json({ 
                success: false, 
                message: 'URL inválida. Forneça um link do Kwai' 
            });
        }

        // Obter o HTML da página do Kwai
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const html = response.data;

        // Extrair a URL do vídeo
        // Nota: Esta expressão regular pode precisar ser atualizada conforme o Kwai muda sua estrutura
        const videoUrlMatch = html.match(/"video":{"url":"([^"]+)"/);
        
        if (!videoUrlMatch || !videoUrlMatch[1]) {
            return res.status(404).json({ 
                success: false, 
                message: 'Não foi possível encontrar o vídeo na página fornecida' 
            });
        }
        
        // Limpar a URL do vídeo (remover escapes)
        const videoUrl = videoUrlMatch[1].replace(/\\u002F/g, '/');
        
        // Extrair informações do autor (opcional)
        const authorMatch = html.match(/"author":\s*{\s*"name":\s*"([^"]+)"/);
        const author = authorMatch ? authorMatch[1] : 'Autor desconhecido';
        
        // Extrair título do vídeo (opcional)
        const titleMatch = html.match(/"caption":\s*"([^"]+)"/);
        const title = titleMatch ? titleMatch[1] : 'Vídeo do Kwai';
        
        // Retornar os dados do vídeo
        return res.json({
            success: true,
            videoUrl,
            author,
            title
        });
    } catch (error) {
        console.error('Erro ao processar vídeo do Kwai:', error);
        
        return res.status(500).json({ 
            success: false, 
            message: 'Erro ao processar o vídeo. Tente novamente mais tarde.' 
        });
    }
});

// Rota para verificar status da API
app.get('/api/status', (req, res) => {
    res.json({ status: 'online' });
});

// Página inicial
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>API de Download de Vídeos do Kwai</title>
                <style>
                    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                    h1 { color: #ff3366; }
                    code { background: #f5f5f5; padding: 2px 5px; border-radius: 3px; }
                </style>
            </head>
            <body>
                <h1>API de Download de Vídeos do Kwai</h1>
                <p>Esta é a API para extrair vídeos do Kwai sem marca d'água.</p>
                <h2>Como usar:</h2>
                <p>Faça uma requisição POST para <code>/api/kwai</code> com o corpo JSON:</p>
                <pre>{ "url": "https://kwai.com/seu-link-do-video" }</pre>
                <p>A resposta será um JSON com a URL do vídeo e informações adicionais.</p>
            </body>
        </html>
    `);
});

// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

// Exportar a aplicação para uso com serverless (Vercel)
module.exports = app; 