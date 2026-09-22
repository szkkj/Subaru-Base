(async () => {
  const { Sticker } = require("../sticker.js");
  const st = new Sticker();
  st.options.edit = "primas"; // piramide | borda | primas | circle
  st.addFile("https://i.stack.imgur.com/EMKmn.png");
  st.metadata = { pack: "Sabrina-BOT", author: "Vitinho", emojis: ["😶"] };
  await await st
    .start()
    .then(console.log)
    .catch((error) => st.error(error));
})();

/*
—⟩ Nota:
	-⟩ Use o buffer/readFile pra não apagar a imagem (ex.: test.png);
		-⟩ Tanto também no "edit";
	-⟩ Pode adicionar (edit | addFile): URL, BUFFER ou FILE;
		-⟩ A proporção deve estar 400x400 com o desenho preto.
	-⟩ Use o "yarn" para baixar as bibliotecas;
————————————————————————————————
—⟩ Requisitos:
	-⟩ node-fetch (v.: 2.6.1)
	-⟩ imagemagick
	-⟩ ffmpeg + fluent-ffmpeg (v.: 2.1.2)
	-⟩ https + http
	-⟩ remove.bg
	-⟩ jimp
	-⟩ node-webpmux
	-⟩ file-type (v.: 16.5.3)
	-⟩ path
	-⟩ fs
*/
