import { useEffect, useMemo, useState } from "react";
import type { Service } from "../types/database";
import { ServiceService } from "../services/serviceService";
import BookingModal from "../components/menu/BookingModal";

type PriceRow = {
  service: string;
  zh: string;
  prices: Array<number | null>;
};

type FilmSpec = {
  model: string;
  name: string;
  vlt: string;
  privacy: string;
  uv: string;
  ir: string;
  thickness: string;
  use: string;
  warning?: string;
};

const BRAND = {
  name: "GTB1N Auto Detailing & Window Film",
  location: "Lashio, Myanmar / 缅甸腊戌",
  locationShort: "Lashio • 腊戌",
  hotline: "09695653413",
  phone2: "09443751188",
  social: "buyaowen9",
  hours: "8:30 AM – 7:00 PM",
};

const vehicleColumns = [
  "Small",
  "Medium",
  "Mini SUV",
  "SUV",
  "Large",
  "Extra Large",
];

const detailingRows: PriceRow[] = [
  { service: "Normal Wash", zh: "普通洗车", prices: [28000, 35000, 42000, 45000, 45000, 58000] },
  { service: "Premium Wash", zh: "精洗", prices: [46000, 52000, 58000, 64000, 70000, 76000] },
  { service: "Undercarriage Cleaning", zh: "底盘清洗", prices: [80000, 88000, 96000, 104000, 112000, 120000] },
  { service: "Headlight Restoration & Polish", zh: "大灯翻新抛光", prices: [60000, 68000, 76000, 84000, 92000, 100000] },
  { service: "Normal Polish", zh: "普通抛光", prices: [150000, 170000, 180000, 200000, 250000, 300000] },
  { service: "Premium Polish", zh: "精细抛光", prices: [200000, 230000, 250000, 300000, 350000, 450000] },
  { service: "Coating (6 Months)", zh: "镀晶 6个月", prices: [280000, 330000, 380000, 410000, 430000, 480000] },
  { service: "Coating (1 Year)", zh: "镀晶 1年", prices: [380000, 430000, 480000, 580000, 680000, 780000] },
  { service: "Coating (2 Years)", zh: "镀晶 2年", prices: [530000, 580000, 730000, 780000, 880000, 980000] },
  { service: "Coating (3 Years)", zh: "镀晶 3年", prices: [680000, 780000, 880000, 980000, 1130000, 1280000] },
  { service: "Coating (5 Years)", zh: "镀晶 5年", prices: [930000, 1030000, 1180000, 1330000, 1480000, 1630000] },
  { service: "Interior Dry Wash", zh: "内饰干洗", prices: [180000, 200000, 210000, 230000, 260000, 330000] },
  { service: "Engine Bay Detailing", zh: "发动机舱精洗", prices: [80000, 80000, 80000, 80000, 80000, 80000] },
  { service: "Full Glass Package", zh: "全车玻璃护理", prices: [130000, 150000, 160000, 160000, 190000, null] },
];

const luJiePackage = [
  { vehicle: "Sedan / 轿车", price: 1100000 },
  { vehicle: "SUV + Pickup / SUV + 皮卡", price: 1300000 },
  { vehicle: "Large SUV + MPV / 大型SUV + MPV", price: 1550000 },
];

const luJieSingle = [
  { item: "Windshield XC-50", zh: "前挡 XC-50", prices: [350000, 420000, 480000] },
  { item: "One Front Side Window LS-25", zh: "单块前排侧窗 LS-25", prices: [140000, 160000, 190000] },
  { item: "One Rear Side Window LS-15 / LS-10", zh: "单块后排侧窗 LS-15 / LS-10", prices: [140000, 160000, 190000] },
  { item: "Rear Windshield LS-15 / LS-10", zh: "后挡 LS-15 / LS-10", prices: [320000, 380000, 450000] },
];

const luJieSpecs: FilmSpec[] = [
  { model: "XC-50", name: "Black Crystal / 黑晶", vlt: "46%", privacy: "40 / 100", uv: "99%", ir: "96%±3", thickness: "2mil", use: "Windshield / 前挡" },
  { model: "LS-25", name: "Xinghui Titanium Nitride / 星晖氮化钛", vlt: "25%", privacy: "60 / 100", uv: "99%", ir: "92%±3", thickness: "2mil", use: "Front Side Windows / 前排侧窗" },
  { model: "LS-15", name: "Xinghui Titanium Nitride / 星晖氮化钛", vlt: "18%", privacy: "80 / 100", uv: "99%", ir: "95%±3", thickness: "2mil", use: "Rear Side + Rear Windshield / 后排侧窗 + 后挡" },
  { model: "LS-10", name: "Xinghui Titanium Nitride / 星晖氮化钛", vlt: "10%", privacy: "100 / 100", uv: "99%", ir: "95%±3", thickness: "2mil", use: "Maximum Rear Privacy / 后排极深隐私", warning: "Not for front side windows / 不建议前排侧窗" },
];

const nanoPackage = [
  { vehicle: "Sedan / 轿车", price: 500000 },
  { vehicle: "SUV + Pickup / SUV + 皮卡", price: 600000 },
  { vehicle: "Large SUV + MPV / 大型SUV + MPV", price: 750000 },
];

const nanoSingle = [
  { item: "Windshield", zh: "前挡", prices: [160000, 190000, 230000] },
  { item: "One Side Window", zh: "单块侧窗", prices: [60000, 70000, 90000] },
  { item: "Rear Windshield", zh: "后挡", prices: [130000, 160000, 200000] },
];

const nanoPrivacy = [
  { privacy: "40%", model: "NC-SI60", vlt: "57.3%", note: "Light & Clear · Windshield / 浅色清晰 · 建议前挡" },
  { privacy: "60%", model: "NC-702", vlt: "36.5%", note: "Medium Shade · Side Windows / 中等颜色 · 建议侧窗" },
  { privacy: "80%", model: "NC-K18", vlt: "16.9%", note: "Dark Privacy · Rear Windows / 深色隐私 · 建议后排" },
  { privacy: "100%", model: "NC-0580", vlt: "2%", note: "Extra Dark · Rear Windows Only / 极深隐私 · 仅限后排" },
];

const posterImages = [
  { src: "/menu-posters/11_detailing_price_list.png", title: "GTB1N Detailing Price List / 汽车美容价格表" },
  { src: "/menu-posters/06_lujie_full_car_package.png", title: "Lu Jie Full-Car Package / 路界全车隔热膜套餐" },
  { src: "/menu-posters/05_lujie_single_glass_prices.png", title: "Lu Jie Single-Glass Prices / 路界单块玻璃价格" },
  { src: "/menu-posters/07_lujie_xc50.png", title: "XC-50 Black Crystal / XC-50 黑晶" },
  { src: "/menu-posters/08_lujie_ls25.png", title: "LS-25 Xinghui Titanium Nitride / 星晖氮化钛" },
  { src: "/menu-posters/09_lujie_ls15.png", title: "LS-15 Xinghui Titanium Nitride / 星晖氮化钛" },
  { src: "/menu-posters/10_lujie_ls10.png", title: "LS-10 Maximum Rear Privacy / 后排极深隐私" },
  { src: "/menu-posters/01_lujie_installation_price_list.png", title: "Lu Jie Installation Price List / 路界施工价格表" },
  { src: "/menu-posters/02_lujie_product_specifications.png", title: "Lu Jie Product Specifications / 路界产品参数" },
  { src: "/menu-posters/03_nano_full_car_price_list.png", title: "Nano Ceramic Film Prices / 纳米陶瓷高清膜价格" },
  { src: "/menu-posters/04_nano_privacy_levels.png", title: "Nano Privacy Levels / 纳米膜隐私深浅" },
];

function mmk(value: number | null) {
  return value == null ? "—" : `${value.toLocaleString()} MMK`;
}

export default function CustomerMenu() {
  const [viewer, setViewer] = useState<{ src: string; title: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [bookableServices, setBookableServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookingLoading, setBookingLoading] = useState(true);
  const [bookingError, setBookingError] = useState("");

  const telegramUrl = useMemo(() => `https://t.me/${BRAND.social}`, []);

  useEffect(() => {
    let alive = true;

    ServiceService.getAll()
      .then((rows) => {
        if (!alive) return;
        setBookableServices(rows.filter((service) => service.is_active !== false));
      })
      .catch(() => {
        if (!alive) return;
        setBookingError("在线预约暂时无法连接，请直接电话或 Telegram 联系。 / Online booking is temporarily unavailable.");
      })
      .finally(() => {
        if (alive) setBookingLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  async function copyContact() {
    try {
      await navigator.clipboard.writeText(BRAND.social);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy WeChat / Telegram ID", BRAND.social);
    }
  }

  return (
    <div className="gtb-menu-page">
      <style>{styles}</style>

      <header className="hero">
        <div className="hero-glow" />
        <div className="hero-inner">
          <div className="brand-line">
            <div>
              <div className="brand">GTB1N</div>
              <div className="brand-sub">AUTO DETAILING & WINDOW FILM</div>
            </div>
            <div className="location-badge">📍 {BRAND.locationShort}</div>
          </div>

          <h1>专业汽车美容 · 洗车 · 抛光 · 镀晶 · 汽车隔热膜</h1>
          <p>Professional Auto Detailing, Car Wash, Polishing, Coating & Window Film</p>

          <div className="hero-actions">
            <a className="btn gold" href={`tel:${BRAND.hotline}`}>📞 {BRAND.hotline}</a>
            <button className="btn dark" onClick={copyContact}>💬 {copied ? "已复制 / Copied" : `WeChat · TG ${BRAND.social}`}</button>
            <a className="btn green" href={telegramUrl} target="_blank" rel="noreferrer">✈️ Telegram</a>
          </div>

          <div className="quick-grid">
            <Info label="LOCATION / 地址" value={BRAND.location} />
            <Info label="OPEN / 营业时间" value={BRAND.hours} />
            <Info label="HOTLINE / 电话" value={BRAND.hotline} />
            <Info label="WECHAT · TG" value={BRAND.social} />
          </div>
        </div>
      </header>

      <nav className="jump-nav">
        <a href="#detailing">汽车美容价格</a>
        <a href="#lujie">路界隔热膜</a>
        <a href="#nano">纳米陶瓷膜</a>
        <a href="#booking">在线预约</a>
        <a href="#posters">完整海报</a>
        <a href="#contact">联系门店</a>
      </nav>

      <main className="content">
        <section id="detailing" className="section">
          <SectionTitle eyebrow="GTB1N AUTO DETAILING" title="汽车美容服务价格表 / Detailing Price List" />
          <div className="table-wrap">
            <table className="price-table six">
              <thead>
                <tr>
                  <th className="service-col">Service / 服务</th>
                  {vehicleColumns.map((v) => <th key={v}>{v}</th>)}
                </tr>
              </thead>
              <tbody>
                {detailingRows.map((row) => (
                  <tr key={row.service}>
                    <td className="service-name"><strong>{row.service}</strong><span>{row.zh}</span></td>
                    {row.prices.map((price, i) => <td key={`${row.service}-${i}`}>{mmk(price)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="note">车型大小以现场确认结果为准 / Vehicle size is confirmed on site.</p>
        </section>

        <section id="lujie" className="section film-section">
          <SectionTitle eyebrow="GTB1N SELECTED · LU JIE WINDOW FILM" title="路界汽车隔热膜 / Lu Jie Window Film" />

          <div className="brand-card">
            <div>
              <div className="mini-kicker">FULL-CAR PACKAGE / 全车套餐</div>
              <h3>XC-50 前挡 + LS-25 前排侧窗 + LS-15 后排侧窗及后挡</h3>
              <p>Rear shade may use LS-15 or LS-10 according to customer choice. / 后排深色可选 LS-15 或 LS-10。</p>
            </div>
            <div className="warranty">6 YEARS<br/><span>厂家资料质保6年</span></div>
          </div>

          <div className="three-cards">
            {luJiePackage.map((item) => <PriceCard key={item.vehicle} title={item.vehicle} price={item.price} />)}
          </div>

          <h3 className="subhead">单块玻璃施工价格 / Single-Glass Installation Prices</h3>
          <div className="table-wrap">
            <table className="price-table">
              <thead><tr><th>Service / 项目</th><th>Sedan / 轿车</th><th>SUV + Pickup</th><th>Large SUV + MPV</th></tr></thead>
              <tbody>
                {luJieSingle.map((row) => (
                  <tr key={row.item}>
                    <td className="service-name"><strong>{row.item}</strong><span>{row.zh}</span></td>
                    {row.prices.map((p, i) => <td key={i}>{mmk(p)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="alert red">ONE SIDE WINDOW = ONE GLASS PANEL, NOT A PAIR / 单块侧窗 = 一块玻璃，不是一对</div>

          <h3 className="subhead">产品参数 / Product Specifications</h3>
          <div className="spec-grid">
            {luJieSpecs.map((spec) => <SpecCard key={spec.model} spec={spec} />)}
          </div>
          <p className="note strong">Manufacturer data / 厂家资料：UV、IR、厚度与质保信息按你提供的路界资料展示。</p>
          <div className="alert">隐私指数越高，膜越深；Privacy Index 不是实际 VLT / Higher Privacy Index = darker film; Privacy Index is not actual VLT.</div>
        </section>

        <section id="nano" className="section nano-section">
          <SectionTitle eyebrow="GTB1N SELECTED" title="纳米陶瓷原色高清膜 / Nano Ceramic Original Color HD Film" />
          <div className="three-cards">
            {nanoPackage.map((item) => <PriceCard key={item.vehicle} title={item.vehicle} price={item.price} />)}
          </div>

          <h3 className="subhead">单独施工 / Individual Installation</h3>
          <div className="table-wrap">
            <table className="price-table">
              <thead><tr><th>Service / 项目</th><th>Sedan / 轿车</th><th>SUV + Pickup</th><th>Large SUV + MPV</th></tr></thead>
              <tbody>
                {nanoSingle.map((row) => (
                  <tr key={row.item}>
                    <td className="service-name"><strong>{row.item}</strong><span>{row.zh}</span></td>
                    {row.prices.map((p, i) => <td key={i}>{mmk(p)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="subhead">选择隐私深浅 / Choose Your Privacy Level</h3>
          <div className="privacy-grid">
            {nanoPrivacy.map((item) => (
              <div className="privacy-card" key={item.model}>
                <div className="privacy-number">{item.privacy}</div>
                <div><strong>{item.model}</strong><span>VLT {item.vlt}</span><p>{item.note}</p></div>
              </div>
            ))}
          </div>
          <div className="alert red">NC-0580 不建议用于前挡或前排侧窗 / NC-0580 is not recommended for windshield or front side windows.</div>
          <p className="note strong">Nano Ceramic Material · No Manufacturer Warranty / 纳米陶瓷材质 · 无厂家质保。旧膜拆除另计 / Old film removal extra.</p>
        </section>


        <section id="booking" className="section booking-section">
          <SectionTitle eyebrow="ONLINE BOOKING" title="在线预约 / Book a Service" />
          <p className="section-copy">价格请以上方车型价格表为准。这里保留你原来的 Supabase 在线预约功能。 / Use the price tables above for pricing; this section keeps your existing Supabase booking flow.</p>

          {bookingLoading && <div className="booking-status">正在加载可预约项目… / Loading bookable services…</div>}
          {bookingError && <div className="booking-status warning">{bookingError}</div>}

          {!bookingLoading && bookableServices.length > 0 && (
            <div className="booking-grid">
              {bookableServices.map((service) => (
                <button className="booking-card" key={service.id} onClick={() => setSelectedService(service)}>
                  <span className="booking-category">{service.category || "Service"}</span>
                  <strong>{service.service_name}</strong>
                  {service.service_name_en && <small>{service.service_name_en}</small>}
                  <span className="booking-action">预约 / Book →</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section id="posters" className="section">
          <SectionTitle eyebrow="ORIGINAL MENU POSTERS" title="完整菜单海报 / Full Menu Posters" />
          <p className="section-copy">点击图片可放大。以下已把你提供的全部菜单海报加入客户网页。</p>
          <div className="poster-grid">
            {posterImages.map((poster) => (
              <button className="poster-card" key={poster.src} onClick={() => setViewer(poster)}>
                <img src={poster.src} alt={poster.title} loading="lazy" />
                <span>{poster.title}</span>
              </button>
            ))}
          </div>
        </section>

        <section id="contact" className="section contact-section">
          <SectionTitle eyebrow="GTB1N LASHIO" title="联系我们 / Contact GTB1N" />
          <div className="contact-grid">
            <Info label="ADDRESS / 地址" value={BRAND.location} />
            <Info label="BUSINESS HOURS / 营业时间" value={BRAND.hours} />
            <Info label="HOTLINE / 电话" value={BRAND.hotline} />
            <Info label="SECOND PHONE / 第二电话" value={BRAND.phone2} />
            <Info label="WECHAT / 微信" value={BRAND.social} />
            <Info label="TELEGRAM / TG" value={BRAND.social} />
          </div>
          <div className="hero-actions bottom-actions">
            <a className="btn gold" href={`tel:${BRAND.hotline}`}>📞 Call {BRAND.hotline}</a>
            <button className="btn dark" onClick={copyContact}>💬 Copy {BRAND.social}</button>
            <a className="btn green" href={telegramUrl} target="_blank" rel="noreferrer">✈️ Telegram</a>
          </div>
        </section>
      </main>

      <footer className="footer">GTB1N Auto Detailing & Window Film · {BRAND.locationShort} · Hotline {BRAND.hotline}</footer>

      {selectedService && (
        <BookingModal service={selectedService} onClose={() => setSelectedService(null)} />
      )}

      {viewer && (
        <div className="viewer" role="dialog" aria-modal="true" onClick={() => setViewer(null)}>
          <button className="viewer-close" onClick={() => setViewer(null)}>×</button>
          <div className="viewer-inner" onClick={(e) => e.stopPropagation()}>
            <img src={viewer.src} alt={viewer.title} />
            <div>{viewer.title}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div className="section-title"><div>{eyebrow}</div><h2>{title}</h2></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="info"><span>{label}</span><strong>{value}</strong></div>;
}

function PriceCard({ title, price }: { title: string; price: number }) {
  return <div className="price-card"><span>{title}</span><strong>{mmk(price)}</strong></div>;
}

function SpecCard({ spec }: { spec: FilmSpec }) {
  return (
    <div className="spec-card">
      <div className="spec-head"><strong>{spec.model}</strong><span>{spec.name}</span></div>
      <div className="spec-stats">
        <Stat label="VLT" value={spec.vlt} />
        <Stat label="PRIVACY INDEX" value={spec.privacy} />
        <Stat label="UV REJECTION" value={spec.uv} />
        <Stat label="IR REJECTION" value={spec.ir} />
        <Stat label="THICKNESS" value={spec.thickness} />
      </div>
      <p className="spec-use">{spec.use}</p>
      {spec.warning && <div className="spec-warning">⚠ {spec.warning}</div>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>;
}

const styles = `
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin: 0; }
  .gtb-menu-page { min-height: 100vh; background: #070707; color: #f8fafc; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .hero { position: relative; overflow: hidden; border-bottom: 1px solid rgba(212,175,55,.32); background: radial-gradient(circle at 80% 10%, rgba(63,255,82,.16), transparent 33%), linear-gradient(135deg,#050505,#0d0d0d 60%,#05140a); }
  .hero-glow { position:absolute; inset:-30% -10% auto auto; width:520px; height:520px; border-radius:50%; background:rgba(49,255,73,.09); filter:blur(70px); }
  .hero-inner { position:relative; max-width:1180px; margin:auto; padding:38px 20px 34px; }
  .brand-line { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; }
  .brand { font-size:clamp(52px,9vw,96px); line-height:.86; font-weight:1000; letter-spacing:-4px; background:linear-gradient(180deg,#fff4b5,#d5a625 55%,#805704); -webkit-background-clip:text; color:transparent; }
  .brand-sub { margin-top:10px; color:#f9e7a3; font-size:13px; font-weight:900; letter-spacing:3px; }
  .location-badge { padding:10px 14px; border:1px solid rgba(255,226,125,.35); border-radius:999px; color:#ffe98d; background:rgba(0,0,0,.45); font-weight:900; white-space:nowrap; }
  .hero h1 { max-width:900px; margin:28px 0 8px; font-size:clamp(25px,4vw,44px); line-height:1.1; }
  .hero p { margin:0; color:#b9c0c7; font-size:15px; }
  .hero-actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:24px; }
  .btn { appearance:none; border:1px solid transparent; border-radius:12px; min-height:44px; padding:0 16px; display:inline-flex; align-items:center; justify-content:center; text-decoration:none; cursor:pointer; font-weight:900; font-size:14px; }
  .btn.gold { background:linear-gradient(180deg,#ffe989,#d3a320); color:#0b0b0b; }
  .btn.dark { background:#111; color:#fff; border-color:#3c3c3c; }
  .btn.green { background:#31e84b; color:#061108; }
  .quick-grid,.contact-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-top:26px; }
  .info { padding:14px; border-radius:12px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.10); }
  .info span { display:block; color:#8b929a; font-size:10px; font-weight:900; letter-spacing:1px; margin-bottom:6px; }
  .info strong { color:#fff; font-size:14px; line-height:1.35; }
  .jump-nav { position:sticky; top:0; z-index:20; display:flex; gap:4px; overflow:auto; padding:10px max(14px,calc((100% - 1180px)/2)); background:rgba(6,6,6,.92); backdrop-filter:blur(14px); border-bottom:1px solid #242424; }
  .jump-nav a { white-space:nowrap; color:#ddd; text-decoration:none; padding:9px 12px; border-radius:999px; font-size:13px; font-weight:800; }
  .jump-nav a:hover { background:#1a1a1a; color:#ffe17a; }
  .content { max-width:1180px; margin:auto; padding:0 20px 60px; }
  .section { padding:56px 0 8px; scroll-margin-top:70px; }
  .section-title > div { color:#d7ad3a; font-size:12px; font-weight:1000; letter-spacing:2px; }
  .section-title h2 { margin:7px 0 22px; font-size:clamp(27px,4vw,44px); letter-spacing:-1px; }
  .section-copy,.note { color:#9da4ab; font-size:13px; line-height:1.6; }
  .note.strong { color:#e4d394; }
  .table-wrap { width:100%; overflow:auto; border:1px solid #2e2a1d; border-radius:14px; background:#0b0b0b; }
  .price-table { width:100%; min-width:760px; border-collapse:collapse; }
  .price-table.six { min-width:1100px; }
  .price-table th { position:sticky; top:0; background:#17150d; color:#f6da78; font-size:12px; padding:13px 10px; border-bottom:1px solid #4b3e1f; text-align:center; }
  .price-table th.service-col { text-align:left; min-width:225px; }
  .price-table td { border-bottom:1px solid #232323; border-right:1px solid #1c1c1c; padding:12px 10px; text-align:center; white-space:nowrap; font-weight:800; font-size:13px; }
  .price-table tr:hover td { background:#10100e; }
  .price-table .service-name { text-align:left; white-space:normal; }
  .service-name strong,.service-name span { display:block; }
  .service-name span { margin-top:3px; color:#8e959d; font-size:11px; font-weight:700; }
  .brand-card { display:flex; justify-content:space-between; gap:18px; align-items:center; border:1px solid #4c3b15; background:linear-gradient(135deg,#161103,#0b0b0b); border-radius:16px; padding:20px; margin-bottom:16px; }
  .mini-kicker { color:#f7d85b; font-weight:1000; font-size:11px; letter-spacing:1.4px; }
  .brand-card h3 { margin:7px 0; font-size:20px; }
  .brand-card p { margin:0; color:#a7a7a7; font-size:12px; line-height:1.6; }
  .warranty { min-width:130px; text-align:center; color:#111; background:#efd154; border-radius:12px; padding:14px; font-size:22px; font-weight:1000; }
  .warranty span { display:block; margin-top:4px; font-size:10px; }
  .three-cards { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin:16px 0 30px; }
  .price-card { min-height:128px; display:flex; flex-direction:column; justify-content:space-between; gap:12px; padding:18px; border-radius:14px; background:linear-gradient(180deg,#f9df78,#c99a25); color:#090909; }
  .price-card span { font-weight:900; font-size:14px; }
  .price-card strong { font-size:clamp(24px,3vw,36px); letter-spacing:-1px; }
  .subhead { margin:36px 0 14px; font-size:22px; color:#f6dc7b; }
  .alert { margin-top:14px; padding:13px 16px; border-radius:10px; border:1px solid #4a7d27; background:#0a1a0b; color:#82ff76; font-weight:900; font-size:12px; text-align:center; }
  .alert.red { border-color:#8c1d1d; background:#260909; color:#ff6c6c; }
  .spec-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
  .spec-card { border:1px solid #3d331c; background:#0c0c0b; border-radius:15px; overflow:hidden; }
  .spec-head { padding:16px; background:linear-gradient(90deg,#182d14,#0e0e0e); border-bottom:1px solid #2d4e28; }
  .spec-head strong,.spec-head span { display:block; }
  .spec-head strong { color:#f3d65d; font-size:28px; }
  .spec-head span { margin-top:3px; color:#c7c7c7; font-size:12px; }
  .spec-stats { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:1px; background:#242424; }
  .stat { padding:12px 8px; background:#0e0e0e; text-align:center; }
  .stat span { display:block; min-height:25px; color:#7f878d; font-size:8px; font-weight:1000; }
  .stat strong { color:#fff0a8; font-size:16px; }
  .spec-use { margin:0; padding:12px 16px; color:#cacaca; font-size:12px; }
  .spec-warning { margin:0 16px 16px; padding:8px; color:#ff6d6d; border:1px solid #6e2323; border-radius:8px; font-size:11px; font-weight:900; text-align:center; }
  .privacy-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
  .privacy-card { display:flex; gap:16px; align-items:center; padding:16px; background:#0d0d0d; border:1px solid #314a2d; border-radius:14px; }
  .privacy-number { min-width:92px; color:#56ec5c; font-size:42px; font-weight:1000; line-height:1; }
  .privacy-card strong,.privacy-card span { display:block; }
  .privacy-card strong { color:#fff; font-size:17px; }
  .privacy-card span { color:#bcbcbc; font-size:12px; margin-top:3px; }
  .privacy-card p { color:#8d959b; font-size:11px; margin:7px 0 0; }
  .booking-section { border-top:1px solid #1f1f1f; }
  .booking-status { padding:14px 16px; border:1px solid #343434; border-radius:12px; color:#bbb; background:#0d0d0d; }
  .booking-status.warning { border-color:#725d22; color:#f0d67e; }
  .booking-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:16px; }
  .booking-card { appearance:none; text-align:left; border:1px solid #2c2c2c; background:#0d0d0d; color:#fff; border-radius:14px; padding:16px; cursor:pointer; }
  .booking-card:hover { border-color:#8f762c; background:#12110d; }
  .booking-category { display:inline-block; color:#d7b84d; font-size:10px; font-weight:1000; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; }
  .booking-card strong,.booking-card small { display:block; }
  .booking-card strong { font-size:17px; }
  .booking-card small { margin-top:5px; color:#8d949a; font-size:11px; }
  .booking-action { display:block; margin-top:16px; color:#60ed69; font-size:12px; font-weight:1000; }
  .poster-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
  .poster-card { appearance:none; padding:0; overflow:hidden; border-radius:14px; border:1px solid #252525; background:#0d0d0d; color:#fff; cursor:pointer; text-align:left; }
  .poster-card:hover { transform:translateY(-2px); border-color:#766126; }
  .poster-card img { width:100%; display:block; aspect-ratio:4/5; object-fit:cover; object-position:top; background:#111; }
  .poster-card span { display:block; padding:11px 12px; font-size:11px; font-weight:800; color:#d5d5d5; }
  .contact-section { margin-top:36px; padding:36px; border:1px solid #3a311b; border-radius:20px; background:linear-gradient(135deg,#111,#0c0d08); }
  .contact-grid { grid-template-columns:repeat(3,minmax(0,1fr)); }
  .bottom-actions { margin-top:18px; }
  .footer { padding:24px 16px; border-top:1px solid #292929; color:#7f858b; text-align:center; font-size:11px; }
  .viewer { position:fixed; inset:0; z-index:1000; display:grid; place-items:center; background:rgba(0,0,0,.92); padding:20px; }
  .viewer-inner { width:min(92vw,920px); height:90vh; display:flex; flex-direction:column; gap:10px; align-items:center; }
  .viewer-inner img { max-width:100%; max-height:calc(90vh - 40px); object-fit:contain; border-radius:8px; box-shadow:0 20px 70px rgba(0,0,0,.7); }
  .viewer-inner div { color:#ddd; font-size:12px; }
  .viewer-close { position:fixed; top:15px; right:18px; width:44px; height:44px; border-radius:50%; border:1px solid #555; background:#111; color:#fff; font-size:26px; cursor:pointer; }
  @media (max-width: 900px) {
    .quick-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .booking-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .spec-grid,.privacy-grid { grid-template-columns:1fr; }
    .poster-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .contact-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .spec-stats { grid-template-columns:repeat(3,minmax(0,1fr)); }
  }
  @media (max-width: 640px) {
    .hero-inner { padding-top:26px; }
    .brand-line { flex-direction:column; }
    .location-badge { align-self:flex-start; }
    .hero-actions .btn { flex:1 1 100%; }
    .quick-grid,.three-cards,.contact-grid,.poster-grid,.booking-grid { grid-template-columns:1fr; }
    .section { padding-top:44px; }
    .content { padding-left:14px; padding-right:14px; }
    .brand-card { flex-direction:column; align-items:stretch; }
    .warranty { width:100%; }
    .privacy-number { min-width:80px; font-size:36px; }
    .contact-section { padding:24px 16px; }
  }
`;
