#!/bin/bash

BLUE='\033[1;34m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
GRAY='\033[0;37m'
RESET='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$ROOT_DIR" || {
  printf "${RED}❌ Não foi possível acessar a raiz do projeto.${RESET}\n"
  exit 1
}

printf "${BLUE}🧹 Limpando e formatando o projeto...${RESET}\n\n"

cat > .prettierignore <<'EOF'
node_modules/
dono/configs/session/
dono/configs/session-baileys/
dono/configs/session-zapo/
database/dev/.scripts/.sqlite3_engines/
database/grupos/
database/imgs/
database/medias/
database/temp/
database/dev/cache/
database/dados/
logs-*.txt
*.sqlite
*.sqlite-shm
*.sqlite-wal
*.log
*.bak
package-lock.json
EOF

printf "${YELLOW}📝 Aplicando prettier (só *.js, *.mjs, *.cjs, *.json, *.md)...${RESET}\n"
if [ -x "./node_modules/.bin/prettier" ]; then
  PRETTIER="./node_modules/.bin/prettier"
else
  PRETTIER="npx --yes prettier"
fi

$PRETTIER --write "**/*.{js,mjs,cjs,json,md}" --log-level=warn 2>&1 | tail -10

printf "\n${YELLOW}🗑️  Removendo .prettierignore e cache do prettier...${RESET}\n"
rm -f .prettierignore
rm -rf node_modules/.cache/prettier

remove_pattern() {
  local pattern="$1"
  local label="$2"

  local count
  count=$(find . -type f -name "$pattern" -not -path "./node_modules/*" 2>/dev/null | wc -l | tr -d ' ')

  if [ "$count" -gt 0 ]; then
    find . -type f -name "$pattern" -not -path "./node_modules/*" -delete 2>/dev/null
  fi

  printf "${GRAY}   %s %s arquivo(s) removido(s).${RESET}\n" "$count" "$label"
}

printf "${YELLOW}🗑️  Removendo arquivos .bak...${RESET}\n"
remove_pattern "*.bak" ".bak"

printf "${YELLOW}🗑️  Removendo JSONs de database/grupos/...${RESET}\n"
GRUPOS_COUNT=$(find ./database/grupos -type f -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
if [ "$GRUPOS_COUNT" -gt 0 ]; then
  find ./database/grupos -type f -name "*.json" -delete 2>/dev/null
fi
printf "${GRAY}   %s arquivo(s) removido(s).${RESET}\n" "$GRUPOS_COUNT"

printf "${YELLOW}🗑️  Removendo JSONs de database/dev/cache/group_metadata/...${RESET}\n"
META_COUNT=$(find ./database/dev/cache/group_metadata -type f -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
if [ "$META_COUNT" -gt 0 ]; then
  find ./database/dev/cache/group_metadata -type f -name "*.json" -delete 2>/dev/null
fi
printf "${GRAY}   %s arquivo(s) removido(s).${RESET}\n" "$META_COUNT"

printf "\n${GREEN}✅ Concluído!${RESET}\n"