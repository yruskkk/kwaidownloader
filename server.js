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

        console.log('Processando URL:', url);

        // Configuração de headers mais completa para simular um navegador
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://www.kwai.com/',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0'
        };

        // Obter o HTML da página do Kwai
        const response = await axios.get(url, { headers });
        const html = response.data;
        
        console.log('HTML recebido, tamanho:', html.length);

        // Diferentes padrões de extração para tentar encontrar o vídeo
        let videoUrl = null;
        
        // Método 1: Padrão antigo
        const videoUrlMatch1 = html.match(/"video":{"url":"([^"]+)"/);
        if (videoUrlMatch1 && videoUrlMatch1[1]) {
            videoUrl = videoUrlMatch1[1].replace(/\\u002F/g, '/');
            console.log('Método 1 encontrou a URL do vídeo');
        }
        
        // Método 2: Novo padrão com "playAddr"
        if (!videoUrl) {
            const videoUrlMatch2 = html.match(/"playAddr":"([^"]+)"/);
            if (videoUrlMatch2 && videoUrlMatch2[1]) {
                videoUrl = videoUrlMatch2[1].replace(/\\u002F/g, '/');
                console.log('Método 2 encontrou a URL do vídeo');
            }
        }
        
        // Método 3: Procurar por URLs MP4 diretas
        if (!videoUrl) {
            const mp4UrlMatch = html.match(/(https:\/\/[^"']+\.mp4)/);
            if (mp4UrlMatch && mp4UrlMatch[1]) {
                videoUrl = mp4UrlMatch[1];
                console.log('Método 3 encontrou a URL do vídeo');
            }
        }
        
        // Método 4: Procurar dados na resposta JSON incorporada
        if (!videoUrl) {
            const jsonDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
            if (jsonDataMatch && jsonDataMatch[1]) {
                try {
                    const jsonData = JSON.parse(jsonDataMatch[1]);
                    console.log('Dados JSON extraídos, procurando URL do vídeo');
                    
                    // Navegar através da estrutura de objetos para encontrar a URL do vídeo
                    if (jsonData.props && jsonData.props.pageProps && jsonData.props.pageProps.videoInfo) {
                        const videoInfo = jsonData.props.pageProps.videoInfo;
                        if (videoInfo.videoUrl) {
                            videoUrl = videoInfo.videoUrl;
                            console.log('URL do vídeo encontrada em videoInfo.videoUrl');
                        } else if (videoInfo.video && videoInfo.video.url) {
                            videoUrl = videoInfo.video.url;
                            console.log('URL do vídeo encontrada em videoInfo.video.url');
                        } else if (videoInfo.mainUrl) {
                            videoUrl = videoInfo.mainUrl;
                            console.log('URL do vídeo encontrada em videoInfo.mainUrl');
                        }
                    }
                } catch (e) {
                    console.error('Erro ao analisar JSON:', e.message);
                }
            }
        }

        if (!videoUrl) {
            console.log('Nenhum método encontrou a URL do vídeo');
            return res.status(404).json({ 
                success: false, 
                message: 'Não foi possível encontrar o vídeo na página fornecida' 
            });
        }
        
        // Extrair informações do autor (opcional)
        let author = 'Autor desconhecido';
        const authorMatch = html.match(/"author":\s*{\s*"name":\s*"([^"]+)"/);
        if (authorMatch && authorMatch[1]) {
            author = authorMatch[1];
        }
        
        // Extrair título do vídeo (opcional)
        let title = 'Vídeo do Kwai';
        const titleMatch = html.match(/"caption":\s*"([^"]+)"/);
        if (titleMatch && titleMatch[1]) {
            title = titleMatch[1];
        }
        
        // Retornar os dados do vídeo
        console.log('Sucesso! URL do vídeo encontrada:', videoUrl.substring(0, 50) + '...');
        return res.json({
            success: true,
            videoUrl,
            author,
            title
        });
    } catch (error) {
        console.error('Erro ao processar vídeo do Kwai:', error.message);
        if (error.response) {
            console.error('Status de resposta:', error.response.status);
            console.error('Headers:', JSON.stringify(error.response.headers));
        }
        
        return res.status(500).json({ 
            success: false, 
            message: 'Erro ao processar o vídeo. Tente novamente mais tarde.' 
        });
    }
});

// NOVO ENDPOINT: Rota para forçar download do vídeo
app.get('/api/download', async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).send('URL não fornecida');
        }
        
        console.log('Processando download da URL:', url);
        
        // Obter o conteúdo do vídeo
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            }
        });
        
        // Obter o nome do arquivo da URL ou usar um nome padrão
        const fileName = url.split('/').pop().split('?')[0] || 'video-kwai.mp4';
        
        // Configurar headers para download
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.setHeader('Content-Type', 'video/mp4');
        
        // Enviar o stream do vídeo para download
        response.data.pipe(res);
        
        console.log('Download iniciado para:', fileName);
        
    } catch (error) {
        console.error('Erro ao baixar vídeo:', error.message);
        if (error.response) {
            console.error('Status da resposta:', error.response.status);
        }
        res.status(500).send('Erro ao processar o download');
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
                <h2>Download direto:</h2>
                <p>Para baixar um vídeo diretamente, use: <code>/api/download?url=URL_DO_VIDEO</code></p>
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
