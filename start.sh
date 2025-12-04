#!/bin/bash
clear

RED='\033[1;31m'
BLUE='\033[1;34m'
WHITE='\033[1;37m'
GREEN='\033[1;32m'
CYAN='\033[1;36m'
YELLOW='\033[1;33m'
RESET='\033[0m'

printf "${RED}╔══════╌✯╌═⊱×⊰ 🎄 𝐒𝐮𝐛𝐚𝐫𝐮-𝐁𝐚𝐬𝐞 🎄 ⊰×⊰═╌✯╌══════╗${RESET}\n"
printf "${RED}║${WHITE}      🎅✨ Iniciando 𝐒𝐮𝐛𝐚𝐫𝐮-𝐁𝐚𝐬𝐞 ✨🎅        ${RED}║${RESET}\n"
printf "${RED}║${BLUE}            ❄️   By: Sz.  ❄️                   ${RED}║${RESET}\n"
printf "${RED}║${BLUE}              Feliz Natal!                   ${RED}║${RESET}\n"
printf "${RED}╚══════╌✯╌═⊱×⊰ 🎁 RAIKKEN-API 🎁 ⊰×⊰═╌✯╌══════╝${RESET}\n\n"

if [ ! -d "node_modules" ]; then
printf "${YELLOW}📦 Instalando dependências natalinas...${RESET}\n"
npm install
printf "${GREEN}🎄🎉 Dependências instaladas com sucesso! 🎉🎄${RESET}\n"
fi

SESSION_DIR="./dono/configs/session"

while true
do
if [ -d "$SESSION_DIR" ] && [ "$(ls -A $SESSION_DIR)" ]; then
printf "${GREEN}🎅✨ Sessão encontrada. Iniciando o trenó... ✨🎅${RESET}\n"
npm start
else
printf "\n"
printf "${CYAN}🎄 Nenhuma sessão encontrada! Escolha como deseja parear o bot: 🎄${RESET}\n"
printf "${YELLOW}1)${RESET} 📸 QR Code\n"
printf "${YELLOW}2)${RESET} 🔢 Código numérico\n"
printf "${YELLOW}3)${RESET} ❌ Sair\n\n"
read -p "Escolha uma opção [1-3]: " opcao

case $opcao in
1)
printf "${CYAN}🔗✨ Gerando QR Code mágico...${RESET}\n"
node conection.js
;;
2)
printf "${CYAN}🔗✨ Iniciando pareamento via código numérico...${RESET}\n"
node conection.js --code
;;
3)
printf "${YELLOW}🎄 Saindo... Ho Ho Ho! 🎅${RESET}\n"
exit 0
;;
*)
printf "${YELLOW}⚠️🎁 Opção inválida! Execute novamente. 🎁${RESET}\n"
exit 1
;;
esac
fi
printf "${YELLOW}⚠️ O bot foi finalizado. Reiniciando em 3s... 🎄${RESET}\n"
sleep 3
done