cd storage
for %%f in (*.flac) do ffmpeg -i "%%f" -q:a 0 "%%~nf.mp3"

del *.flac