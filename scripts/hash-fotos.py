"""
Huella de cada foto (dHash de 64 bits) para encontrar el mismo producto
vendido por dos tiendas: cambian el título y el número de artículo, pero no la
foto. Lo usa scripts/ampliar-catalogo.ts.

Entrada (stdin): lista JSON de URL. Salida (stdout): objeto JSON {url: huella
en hexadecimal}; las fotos que no se pueden bajar no salen.

    python3 -I scripts/hash-fotos.py < urls.json
"""
import io
import json
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from PIL import Image


def huella(url):
    peticion = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 PescaPlus"})
    with urllib.request.urlopen(peticion, timeout=20) as r:
        datos = r.read(5_000_000)
    img = Image.open(io.BytesIO(datos)).convert("L").resize((9, 8))
    px = img.tobytes()  # en modo «L», un byte por píxel
    bits = 0
    for fila in range(8):
        for col in range(8):
            bits = (bits << 1) | (1 if px[fila * 9 + col] > px[fila * 9 + col + 1] else 0)
    return f"{bits:016x}"


def intenta(url):
    try:
        return url, huella(url)
    except Exception:
        return url, None


urls = json.load(sys.stdin)
with ThreadPoolExecutor(max_workers=8) as pool:
    resultado = {u: h for u, h in pool.map(intenta, urls) if h}
json.dump(resultado, sys.stdout)
