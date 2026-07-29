const message = await fetch('./message.txt').then((response) => response.text());

t.fontSize(16);
t.draw(() => {
	t.background('#111111');
	t.charColor('#ffffff');
	t.cellColor('#111111');
	t.print(message.trim(), 2, 2);
});
