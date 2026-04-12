const rmLetras = (txt) => {
  return txt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
}

const getdistance = (a, b) => {
  if(a.length === 0) return b.length 
  if(b.length === 0) return a.length 
  
  const matrix = [] 
  
  for(let i = 0; i <= b.length; i++) {
    matrix[i] = [i] 
  }
  
  for(let j = 0; j <= a.length; j++) {
    matrix[0][j] = j 
  }
  
  for(let i = 1; i <= b.length; i++) {
    for(let j = 1; j <= a.length; j++) {
      if(b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1] 
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        ) 
      }
    }
  }
  return matrix[b.length][a.length] 
} 

const getSimilarity = (array, txt) => {
  let minDistance = Infinity
  let nome = '' 
  let porcentagem = 0

  let find = rmLetras(txt)

  array.forEach((word) => {
    const distance = getdistance(find, word.toLowerCase())
    const tamanhoMaximo = Math.max(find.length, word.length) 
    const similaridade = 1 - distance / tamanhoMaximo  

    if(similaridade > porcentagem) {
      nome = word
      porcentagem = similaridade 
    }
  }) 
  
  if(porcentagem < 0.01) return {
    nome: `"não encontrado"`,
    porcentagem: 0
  }

  return {nome, porcentagem: porcentagem * 100}
}

export { getSimilarity };