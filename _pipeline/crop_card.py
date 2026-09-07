import cv2, numpy as np, sys

def order(pts):
    s = pts.sum(1); d = np.diff(pts,axis=1).ravel()
    return np.array([pts[np.argmin(s)], pts[np.argmin(d)], pts[np.argmax(s)], pts[np.argmax(d)]], np.float32)

def find_card(img):
    g = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY),(5,5),0)
    _,th = cv2.threshold(g,0,255,cv2.THRESH_BINARY+cv2.THRESH_OTSU)
    th = cv2.morphologyEx(th, cv2.MORPH_CLOSE, np.ones((25,25),np.uint8))
    cnts,_ = cv2.findContours(th, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    c = max(cnts, key=cv2.contourArea)
    peri = cv2.arcLength(c, True); ap=None
    for eps in (0.02,0.03,0.05,0.08):
        a = cv2.approxPolyDP(c, eps*peri, True)
        if len(a)==4: ap=a; break
    if ap is None:
        ap = cv2.boxPoints(cv2.minAreaRect(c)).astype(np.int32).reshape(-1,1,2)
    return order(ap.reshape(4,2).astype(np.float32))

def clean(gray):
    d = cv2.fastNlMeansDenoising(gray, None, h=12, templateWindowSize=7, searchWindowSize=21)
    f = d.astype(np.float32)
    lo,hi = np.percentile(f,3), np.percentile(f,72)
    f = np.clip((f-lo)*255/(hi-lo),0,255)
    f = np.where(f>196,255,f); f = np.where(f<24,12,f).astype(np.uint8)
    bl = cv2.GaussianBlur(f,(0,0),1.1)
    return np.clip(cv2.addWeighted(f,1.5,bl,-0.5,0),0,255).astype(np.uint8)

def trim(g, pad=26):
    mask = (g < 195).astype(np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5,5),np.uint8))  # drop specks
    ys, xs = np.where(mask>0)
    if len(xs)==0: return g
    x0,x1,y0,y1 = xs.min(),xs.max(),ys.min(),ys.max()
    x0=max(0,x0-pad); y0=max(0,y0-pad); x1=min(g.shape[1],x1+pad); y1=min(g.shape[0],y1+pad)
    return g[y0:y1, x0:x1]

src,out,y0f,y1f = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
img = cv2.imread(src)
quad = find_card(img)
W,H = 1000,1667
card = cv2.warpPerspective(img, cv2.getPerspectiveTransform(quad, np.array([[0,0],[W,0],[W,H],[0,H]],np.float32)), (W,H))
crop = card[int(H*y0f):int(H*y1f), int(W*0.03):int(W*0.97)]
g = trim(clean(cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)))
g = cv2.copyMakeBorder(g, 18,18,18,18, cv2.BORDER_CONSTANT, value=255)
sc = 880/g.shape[1]
g = cv2.resize(g,(880,round(g.shape[0]*sc)),interpolation=cv2.INTER_AREA)
cv2.imwrite(out, g, [cv2.IMWRITE_JPEG_QUALITY,86])
print("wrote", out, g.shape)
