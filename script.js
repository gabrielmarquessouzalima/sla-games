const canvas = document.getElementById("jogoCanvas");
const ctx = canvas.getContext("2d");
const btnStart = document.getElementById("btnStart");

canvas.width = 800;
canvas.height = 400;

let estadoAtual = "TELA_INICIAL"; 
let score = 0;
let recordes = JSON.parse(localStorage.getItem("ranking")) || [];

const player = {
    x: 0, 
    y: 310, 
    largura: 40,
    altura: 40,
    cor: "#00aaff",
    velocidade: 6,
    velY: 0,
    gravidade: 0.8,
    pulo: -15,
    noChao: false,
    direcao: "direita" 
};

const camera = { x: 0 };
const chaoY = 350;
const teclas = {};

// --- Obstáculos ---
let obstaculos = [];
let proximoObstaculoX = 800;

function gerarObstaculos() {
    // Se o último obstáculo estiver perto de entrar na tela, gera outro
    if (proximoObstaculoX < player.x + 1000) {
        let largura = 30 + Math.random() * 40;
        let altura = 40 + Math.random() * 60;
        obstaculos.push({
            x: proximoObstaculoX,
            y: chaoY - altura,
            largura: largura,
            altura: altura,
            cor: "#ff4444"
        });
        // Espaçamento aleatório entre 300 e 600 pixels
        proximoObstaculoX += 300 + Math.random() * 300;
    }

    // Remove obstáculos que ficaram muito para trás para otimizar performance
    obstaculos = obstaculos.filter(obs => obs.x > player.x - 400);
}

// --- Parallax ---
const parallax = {
    camadas: [
        { x: 0, velocidade: 0.1, cor: "#050515", alturaBase: 180, larguraPredio: 100, espacamento: 120 },
        { x: 0, velocidade: 0.4, cor: "#0d0d25", alturaBase: 120, larguraPredio: 80,  espacamento: 100 },
        { x: 0, velocidade: 0.7, cor: "#161630", alturaBase: 80,  larguraPredio: 60,  espacamento: 90 }
    ]
};

const dialogo = {
    texto: ["Desperte...", "A cidade consome o que restou...", "Corra para não ser esquecido."],
    indiceAtual: 0,
    caixa: { x: 50, y: 250, largura: 700, altura: 120, corFundo: "#000033", corBorda: "#00001a" }
};

// --- Funções de Lógica ---

function resetJogo() {
    player.x = 0;
    player.y = 310;
    player.velY = 0;
    score = 0;
    obstaculos = [];
    proximoObstaculoX = 800;
    camera.x = 0;
}

function salvarRecorde(novoScore) {
    recordes.push(Math.floor(novoScore));
    recordes.sort((a, b) => b - a); // Ordem decrescente
    recordes = recordes.slice(0, 5); // Mantém apenas o top 5
    localStorage.setItem("ranking", JSON.stringify(recordes));
}

function verificarColisao(p, o) {
    // Margem de erro de 5px para ser mais justo com o jogador
    return p.x < o.x + o.largura - 5 &&
           p.x + p.largura > o.x + 5 &&
           p.y < o.y + o.altura - 5 &&
           p.y + p.altura > o.y + 5;
}

// --- Eventos ---
window.addEventListener("keydown", (e) => {
    teclas[e.code] = true;
    if (estadoAtual === "DIALOGO" && (e.code === "Space" || e.code === "Enter")) {
        dialogo.indiceAtual++;
        if (dialogo.indiceAtual >= dialogo.texto.length) estadoAtual = "JOGANDO"; 
    }
    if (estadoAtual === "GAME_OVER" && e.code === "KeyR") {
        resetJogo();
        estadoAtual = "JOGANDO";
    }
});

window.addEventListener("keyup", (e) => teclas[e.code] = false);

btnStart.addEventListener("click", () => {
    estadoAtual = "DIALOGO";
    btnStart.style.display = "none"; 
});

// --- Renderização ---

function desenharCenario() {
    ctx.fillStyle = "#00000a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Estrelas
    ctx.fillStyle = "white";
    for(let i = 0; i < 40; i++) {
        let x = ((i * 137) - (camera.x * 0.05)) % canvas.width;
        if (x < 0) x += canvas.width;
        let y = (i * 243) % 200;
        ctx.fillRect(x, y, 1, 1);
    }

    parallax.camadas.forEach((camada, index) => {
        ctx.fillStyle = camada.cor;
        let scrollX = (camera.x * camada.velocidade) % camada.espacamento;
        for (let i = -1; i < (canvas.width / camada.espacamento) + 2; i++) {
            let xPos = (i * camada.espacamento) - scrollX;
            let indicePredioMundo = Math.floor((camera.x * camada.velocidade) / camada.espacamento) + i;
            let h = camada.alturaBase + (Math.abs(Math.sin(indicePredioMundo + index)) * 60);
            ctx.fillRect(xPos, chaoY - h, camada.larguraPredio, h);
        }
    });
}

function atualizar() {
    if (estadoAtual === "JOGANDO") {
        if (teclas["KeyA"]) { player.x -= player.velocidade; player.direcao = "esquerda"; }
        if (teclas["KeyD"]) { player.x += player.velocidade; player.direcao = "direita"; }
        if (player.x < 0) player.x = 0;

        // Score baseado na distância
        if (player.x / 10 > score) score = Math.floor(player.x / 10);

        camera.x = player.x - 150; 
        if (camera.x < 0) camera.x = 0;

        if ((teclas["KeyW"] || teclas["Space"]) && player.noChao) {
            player.velY = player.pulo;
            player.noChao = false;
        }

        player.velY += player.gravidade;
        player.y += player.velY;

        if (player.y + player.altura >= chaoY) {
            player.y = chaoY - player.altura;
            player.velY = 0;
            player.noChao = true;
        }

        gerarObstaculos();

        // Checar colisões
        obstaculos.forEach(obs => {
            if (verificarColisao(player, obs)) {
                salvarRecorde(score);
                estadoAtual = "GAME_OVER";
            }
        });
    }
    desenhar();
    requestAnimationFrame(atualizar);
}

function desenhar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (estadoAtual === "TELA_INICIAL") {
        ctx.fillStyle = "#00001a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "40px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText("CIDADE INFINITA", canvas.width / 2, 150);
    } 
    else if (estadoAtual === "DIALOGO") {
        ctx.fillStyle = "#00000a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = dialogo.caixa.corBorda;
        ctx.fillRect(dialogo.caixa.x - 4, dialogo.caixa.y - 4, dialogo.caixa.largura + 8, dialogo.caixa.altura + 8);
        ctx.fillStyle = dialogo.caixa.corFundo;
        ctx.fillRect(dialogo.caixa.x, dialogo.caixa.y, dialogo.caixa.largura, dialogo.caixa.altura);
        ctx.fillStyle = "white";
        ctx.font = "20px 'Courier New', monospace";
        ctx.textAlign = "left";
        ctx.fillText(dialogo.texto[dialogo.indiceAtual], dialogo.caixa.x + 20, dialogo.caixa.y + 40);
    } 
    else if (estadoAtual === "JOGANDO" || estadoAtual === "GAME_OVER") {
        desenharCenario();
        ctx.fillStyle = "#111";
        ctx.fillRect(0, chaoY, canvas.width, canvas.height - chaoY);

        // Desenhar Obstáculos
        obstaculos.forEach(obs => {
            ctx.fillStyle = obs.cor;
            ctx.fillRect(obs.x - camera.x, obs.y, obs.largura, obs.altura);
        });

        // Player
        let playerRelativoX = player.x - camera.x;
        ctx.fillStyle = player.cor;
        ctx.fillRect(playerRelativoX, player.y, player.largura, player.altura);
        ctx.fillStyle = "white";
        let olhoX = player.direcao === "direita" ? playerRelativoX + 25 : playerRelativoX + 7;
        ctx.fillRect(olhoX, player.y + 10, 8, 8);

        // UI de Score
        ctx.fillStyle = "yellow";
        ctx.font = "20px 'Courier New', monospace";
        ctx.textAlign = "left";
        ctx.fillText(`SCORE: ${score}`, 20, 40);

        if (estadoAtual === "GAME_OVER") {
            ctx.fillStyle = "rgba(0,0,0,0.8)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "red";
            ctx.font = "40px 'Courier New', monospace";
            ctx.textAlign = "center";
            ctx.fillText("GAME OVER", canvas.width / 2, 100);
            
            ctx.fillStyle = "white";
            ctx.font = "20px 'Courier New', monospace";
            ctx.fillText("RANKING TOP 5:", canvas.width / 2, 160);
            recordes.forEach((rec, i) => {
                ctx.fillText(`${i+1}º - ${rec}`, canvas.width / 2, 190 + (i * 25));
            });
            
            ctx.fillStyle = "#aaa";
            ctx.fillText("Pressione 'R' para recomeçar", canvas.width / 2, 350);
        }
    }
}

atualizar();