#!/bin/bash

# ╔══════════════════════════════════════════╗
# ║         PS Claw — Script de Update       ║
# ╚══════════════════════════════════════════╝

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ██████╗ ███████╗     ██████╗██╗      █████╗ ██╗    ██╗"
echo "  ██╔══██╗██╔════╝    ██╔════╝██║     ██╔══██╗██║    ██║"
echo "  ██████╔╝███████╗    ██║     ██║     ███████║██║ █╗ ██║"
echo "  ██╔═══╝ ╚════██║    ██║     ██║     ██╔══██║██║███╗██║"
echo "  ██║     ███████║    ╚██████╗███████╗██║  ██║╚███╔███╔╝"
echo "  ╚═╝     ╚══════╝     ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝"
echo -e "${NC}"
echo -e "${YELLOW}  Atualizando PS Claw...${NC}"
echo ""

if [ ! -f "openclaw.mjs" ]; then
  echo -e "${RED}❌ Execute este script dentro da pasta do PS Claw!${NC}"
  exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
CURRENT=$(git rev-parse --short HEAD 2>/dev/null || echo "desconhecido")

echo -e "  Branch atual: ${CYAN}${BRANCH}${NC}"
echo -e "  Versão atual: ${CYAN}${CURRENT}${NC}"
echo ""

if ! git diff --quiet 2>/dev/null; then
  echo -e "${YELLOW}⚠️  Você tem mudanças locais não salvas.${NC}"
  read -p "  Deseja continuar mesmo assim? (s/N): " CONFIRM
  if [[ ! "$CONFIRM" =~ ^[sS]$ ]]; then
    echo -e "${RED}Update cancelado.${NC}"
    exit 0
  fi
fi

echo -e "${YELLOW}🔄 Buscando atualizações do GitHub...${NC}"
git fetch origin

REMOTE=$(git rev-parse --short origin/${BRANCH} 2>/dev/null || echo "erro")

if [ "$CURRENT" = "$REMOTE" ]; then
  echo -e "${GREEN}✅ PS Claw já está na versão mais recente! (${CURRENT})${NC}"
  exit 0
fi

echo -e "  Nova versão disponível: ${GREEN}${REMOTE}${NC}"
echo ""

echo -e "${YELLOW}⬇️  Baixando atualização...${NC}"
git pull origin "${BRANCH}"

if git diff HEAD@{1} HEAD --name-only 2>/dev/null | grep -q "package.json\|pnpm-lock.yaml"; then
  echo ""
  echo -e "${YELLOW}📦 Dependências atualizadas, reinstalando...${NC}"
  if command -v pnpm &>/dev/null; then
    pnpm install
  else
    npm install
  fi
fi

NEW=$(git rev-parse --short HEAD)
echo ""
echo -e "${GREEN}✅ PS Claw atualizado com sucesso!${NC}"
echo -e "   ${CURRENT} → ${GREEN}${NEW}${NC}"
echo ""
echo -e "  Para iniciar: ${CYAN}node openclaw.mjs${NC}"
echo "  Interface web: ${CYAN}node web-ui/server.mjs${NC}"
