import re, sys
S = sys.argv[1]
src = open(f"{S}/v8-src.html", encoding="utf-8").read()
names = ["python","fastapi","django","java","docker","githubactions","postgresql","git"]
def clean(t):
    t = re.sub(r"<\?xml.*?\?>", "", t, flags=re.S)
    t = re.sub(r"<!--.*?-->", "", t, flags=re.S)
    t = re.sub(r"<!DOCTYPE[^>]*>", "", t, flags=re.I).strip()
    return re.sub(r"<svg\b", '<svg aria-hidden="true" focusable="false"', t, count=1)
for n in names:
    src = src.replace(f"%%MONO:{n}%%", clean(open(f"{S}/icons-plain/{n}.svg", encoding="utf-8").read()))
src = src.replace("%%MONO:spring%%", clean(open(f"{S}/icons-dl/spring-original.svg", encoding="utf-8").read()))
assert "%%" not in src, re.findall(r"%%[^%]*%%", src)
# only allowed CDNs, exact versions
for u in re.findall(r"<script[^>]+src=\"([^\"]+)\"", src):
    assert u.startswith("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/") or u.startswith("https://cdn.jsdelivr.net/npm/three@0.128.0/"), u
assert not re.search(r"<(!doctype|html|head|body)\b", src, flags=re.I)
assert src.startswith("<title>Diego Olalla</title>")
open(f"{S}/blueprint.html", "w", encoding="utf-8").write(src)
for i, m in enumerate(re.findall(r"<script>(.*?)</script>", src, flags=re.S)):
    open(f"{S}/chk8_{i}.js", "w", encoding="utf-8").write(m)
print(len(src.encode()), "bytes;", len(re.findall(r"<svg aria-hidden", src)), "icons;", len(re.findall(r"<script>", src)), "inline scripts")
