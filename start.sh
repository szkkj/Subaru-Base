#!/bin/bash
clear

BLUE='\033[1;34m'
WHITE='\033[1;37m'
YELLOW='\033[1;33m'
GREEN='\033[1;32m'
CYAN='\033[1;36m'
GRAY='\033[0;37m'
MAGENTA='\033[1;35m'
RED='\033[1;31m'
RESET='\033[0m'
export SQLITE_VERSION=13.0.3

SETTINGS="./dono/configs/settings.json"
SESSION_ROOT="./dono/configs/session"

get_engine() {
  node -e "try{const fs=require('fs');const s=JSON.parse(fs.readFileSync('$SETTINGS','utf8'));console.log(s.engine||'baileys')}catch(e){console.log('baileys')}" 2>/dev/null
}

set_engine() {
  node -e "const fs=require('fs');const p='$SETTINGS';const s=JSON.parse(fs.readFileSync(p,'utf8'));s.engine='$1';fs.writeFileSync(p,JSON.stringify(s,null,2))"
}

has_session() {
  local dir="$SESSION_ROOT/$1"
  [ -d "$dir" ] && [ "$(ls -A "$dir" 2>/dev/null)" ]
}

print_header() {
  local engine=$(get_engine)
  local b="✗"
  local z="✗"
  has_session "baileys" && b="✓"
  has_session "zapo" && z="✓"

  printf "${BLUE}╔══════╌✯╌═⊱×⊰ 𝐒𝐮𝐛𝐚𝐫𝐮-𝐁𝐚𝐬𝐞 ⊰×⊰═╌✯╌══════╗${RESET}\n"
  printf "${BLUE}║${WHITE}        🚀 Iniciando 𝐒𝐮𝐛𝐚𝐫𝐮-𝐁𝐚𝐬𝐞       ${BLUE}║${RESET}\n"
  printf "${BLUE}║${GRAY}                 By: Sz.               ${BLUE}║${RESET}\n"
  printf "${BLUE}║${GRAY}     Conexão será feita em: ${WHITE}%-7s${BLUE}    ║${RESET}\n" "$(echo "$engine" | tr '[:lower:]' '[:upper:]')"
  printf "${BLUE}╚══════╌✯╌═⊱×⊰ RAIKKEN-API ⊰×⊰═╌✯╌══════╝${RESET}\n"
  printf "${GRAY}   Baileys: %s   |   Zapo: %s${RESET}\n\n" "$b" "$z"
}

print_header

if [ ! -d "node_modules" ]; then
  printf "${YELLOW}📦 Instalando dependências...${RESET}\n"
  npm install
  printf "${GREEN}✅ Dependências instaladas com sucesso!${RESET}\n"
fi

while true
do
  engine=$(get_engine)

  if has_session "$engine"; then
    printf "${GREEN}✅ Sessão (%s) encontrada. Iniciando...${RESET}\n" "$engine"
    npm start
  else
    printf "\n"
    printf "${CYAN}Nenhuma sessão de %s encontrada! Como deseja parear?${RESET}\n" "$engine"
    printf "${YELLOW}1)${RESET} QR Code\n"
    printf "${YELLOW}2)${RESET} Código numérico\n"
    printf "${YELLOW}3)${RESET} Instalar módulos\n"
    printf "${YELLOW}4)${RESET} Alterar engine (atual: %s)\n" "$engine"
    printf "${YELLOW}5)${RESET} Sair\n\n"
    read -p "Escolha uma opção [1-5]: " opcao

    case $opcao in
      1)
        printf "${CYAN}🔗 Iniciando pareamento via QR Code...${RESET}\n"
        node conection.js
        ;;
      2)
        printf "${CYAN}🔗 Iniciando pareamento via Código numérico...${RESET}\n"
        node conection.js --code
        ;;
      3)
        printf "${CYAN}📦 Instalando módulos...${RESET}\n"
        npm install
        printf "${GREEN}✅ Módulos instalados com sucesso!${RESET}\n"
        ;;
      4)
        current=$(get_engine)
        if [ "$current" = "baileys" ]; then
          set_engine "zapo"
          printf "${GREEN}✅ Engine alterada para: ZAPO${RESET}\n"
        else
          set_engine "baileys"
          printf "${GREEN}✅ Engine alterada para: BAILEYS${RESET}\n"
        fi
        sleep 1
        clear
        print_header
        continue
        ;;
      5)
        printf "${YELLOW}❌ Saindo...${RESET}\n"
        exit 0
        ;;
      *)
        printf "${YELLOW}⚠️ Opção inválida! Execute novamente.${RESET}\n"
        exit 1
        ;;
    esac
  fi
  printf "${YELLOW}⚠️ O bot foi finalizado. Reiniciando em 3s...${RESET}\n"
  sleep 3
done