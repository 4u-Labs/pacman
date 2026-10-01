# Pac-Man — Clássico Arcade 🕹️👻

Recriação autêntica e moderna em visual de gabinete arcade do lendário **Pac-Man** (1980), desenvolvida com HTML5 Canvas, CSS3 e Vanilla JavaScript.

Disponível online em: [https://4u.ia.br/app/pacman/](https://4u.ia.br/app/pacman/)

---

## ✨ Melhorias e Funcionalidades

- **🕹️ Gabinete Retrô Arcade:** Moldura em estilo fliperama com tipografia pixelada (`Press Start 2P`), brilho CRT e placar clássico no topo (**1UP** e **HIGH SCORE**).
- **🎵 Sintetizador Web Audio API:** Todos os efeitos sonoros icônicos (Waka-waka, sirene de início, fantasma assustado, comer fruta e fantasma, e game over) gerados proceduralmente sem carregar arquivos MP3 externos.
- **📱 D-Pad Virtual & Gestos Touch:** Controles virtuais na tela para celular/tablet com D-Pad analógico/direcional responsivo e suporte a gestos de deslize (*swipe*).
- **🏆 Persistência de Recorde (High Score):** Salva o maior placar no `localStorage` do navegador para desafiar suas próprias marcas.
- **⏸️ Pausa & Atalhos Rápidos de Teclado:**
  - `Setas` ou `WASD`: Movimentar o Pac-Man
  - `P` ou `Espaço`: Pausar / Continuar
  - `N`: Iniciar Novo Jogo
  - `S`: Ligar / Desligar Efeitos Sonoros
- **📱 PWA Ready:** Manifesto para instalação em tela cheia no Android, iOS e Desktop.

---

## 🚀 Como Executar Localmente

Não requer instalação de dependências ou build complexo:

```bash
# Clone o repositório
git clone git@github.com:4u-Labs/pacman.git

# Acesse o diretório
cd pacman

# Inicie um servidor HTTP local simples
python3 -m http.server 8080
```

Abra no navegador em `http://localhost:8080`.

---

## 🛠️ Tecnologias Utilizadas

- **HTML5:** Canvas e semântica web.
- **CSS3:** Flexbox, responsividade para telas móveis e estética arcade retrô.
- **JavaScript (ES6+):** Motor de física/tabuleiro do Pac-Man, IA dos 4 fantasmas (Blinky, Pinky, Inky e Clyde), sintetizador de áudio e listeners de eventos.

---

© 2026 [4U.IA.BR](https://4u.ia.br) — Todos os direitos reservados.
