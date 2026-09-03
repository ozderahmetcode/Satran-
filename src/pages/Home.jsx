import React from 'react';

export default function Home({ stats, leaders, setCurrentPage }) {
  const topThree = leaders?.champions?.slice(0, 3) || [];
  const hasChampions = topThree.length > 0;

  return (
    <div className="animate-fade-in" style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', gap: '80px' }}>
      
      {/* Hero Section */}
      <section style={{ textAlign: 'center', padding: '60px 0 20px 0' }}>
        <h1 style={{
          fontFamily: 'var(--font-title)',
          fontSize: '56px',
          fontWeight: 800,
          lineHeight: 1.2,
          marginBottom: '20px'
        }}>
          Sosyal Satranç Kültürü <br />
          Şimdi <span className="text-gradient">ozder</span> ile Buluşuyor
        </h1>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '18px',
          maxWidth: '650px',
          margin: '0 auto 40px auto'
        }}>
          Ümraniye Tilda Cafe'de düzenlenen, satrancın heyecanını kahve kokusu ve samimi sohbetlerle birleştiren özgün etkinliklerimize katılın.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <button onClick={() => setCurrentPage('event')} className="btn-primary">
            Etkinliğe Katıl ve Yerini Ayırt
          </button>
          <button onClick={() => setCurrentPage('database')} className="btn-secondary">
            Sıralamayı İncele
          </button>
        </div>
      </section>

      {/* Stats Section */}
      <section className="glass-panel" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '40px',
        textAlign: 'center',
        background: 'rgba(22, 24, 30, 0.4)'
      }}>
        <div>
          <h3 style={{ fontSize: '48px', fontFamily: 'var(--font-title)', fontWeight: 800, color: 'var(--accent-primary)' }}>
            {stats?.organizedTournaments || '0'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 500 }}>Düzenlenen Turnuva & Buluşma</p>
        </div>
        <div>
          <h3 style={{ fontSize: '48px', fontFamily: 'var(--font-title)', fontWeight: 800, color: 'var(--accent-secondary)' }}>
            {stats?.gamesPlayed || '0'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 500 }}>Oynanan Maç</p>
        </div>
        <div>
          <h3 style={{ fontSize: '48px', fontFamily: 'var(--font-title)', fontWeight: 800, color: '#f59e0b' }}>
            {stats?.registeredPlayers || '0'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 500 }}>Kayıtlı Oyuncu</p>
        </div>
      </section>

      {/* Highlighted Event Promo */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '40px',
        alignItems: 'center'
      }}>
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', height: '360px', position: 'relative', borderRadius: '20px' }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, transparent, rgba(11, 12, 16, 0.95))',
            zIndex: 1
          }} />
          <div style={{
            position: 'absolute',
            bottom: '24px',
            left: '24px',
            right: '24px',
            zIndex: 2
          }}>
            <span style={{
              background: 'var(--accent-primary)',
              color: '#000',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase'
            }}>Etkinlik Detayları</span>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '24px', fontWeight: 700, marginTop: '12px' }}>
              Tilda Cafe Sosyal Satranç Buluşmaları
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>
              📍 Ümraniye Tilda Cafe
            </p>
          </div>
          <div style={{
            width: '100%',
            height: '100%',
            background: 'radial-gradient(circle, var(--accent-secondary) 0%, var(--bg-color) 100%)',
            opacity: 0.15,
            position: 'absolute'
          }} />
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            fontSize: '160px',
            opacity: 0.12,
            userSelect: 'none'
          }}>
            👑
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '36px', fontWeight: 800 }}>
            Neden <span className="text-gradient">ozder</span>'e Katılmalısın?
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            ozder, sıradan bir satranç turnuvasından çok daha fazlasıdır. Burası her seviyeden insanın keyifle satranç oynayabileceği, yeni arkadaşlar edinebileceği ve kendini geliştirebileceği aktif bir sosyal topluluktur.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
            {[
              { title: "Sosyal ve Keyifli Ortam", desc: "Ümraniye Tilda Cafe'nin sıcacık atmosferinde kahvenizi yudumlarken rekabetin keyfini çıkarın." },
              { title: "Her Seviyeye Uygun", desc: "İster başlangıç seviyesinde olun ister usta bir oyuncu, kendinize uygun rakipler bulacaksınız." },
              { title: "Resmi Olmayan Dinamik Sıralama", desc: "Oynadığınız her maç topluluk istatistiklerine yansır ve sizi liderlik panosunda üst sıralara taşır." }
            ].map((item, index) => (
              <div key={index} style={{ display: 'flex', gap: '16px' }}>
                <div style={{
                  color: 'var(--accent-primary)',
                  fontSize: '20px',
                  fontWeight: 'bold'
                }}>✓</div>
                <div>
                  <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '16px', fontWeight: 600 }}>{item.title}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Champions Showcase Section */}
      <section style={{ textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '36px', fontWeight: 800, marginBottom: '16px' }}>
          🏆 Haftanın Şampiyonları
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 48px auto' }}>
          Son turnuvalarda gösterdikleri üstün performansla liderlik tahtının zirvesinde yer alan oyuncularımız.
        </p>

        {!hasChampions ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Henüz tamamlanan turnuva bulunmadığından şampiyonluk kürsüsü boş.</p>
        ) : (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            gap: '20px',
            maxWidth: '700px',
            margin: '0 auto',
            paddingBottom: '40px',
            flexWrap: 'wrap'
          }}>
            {/* 2nd Place */}
            {topThree[1] && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '150px' }}>
                <div style={{ fontSize: '32px' }}>🥈</div>
                <div style={{ fontFamily: 'var(--font-title)', fontWeight: 600, fontSize: '15px', marginBottom: '8px' }}>{topThree[1].name}</div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '8px 8px 0 0',
                  width: '100%',
                  height: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-title)',
                  fontWeight: 'bold',
                  color: 'var(--text-secondary)'
                }}>
                  {topThree[1].points} ELO
                </div>
              </div>
            )}

            {/* 1st Place */}
            {topThree[0] && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '180px', transform: 'scale(1.05)' }}>
                <div style={{ fontSize: '40px' }}>👑</div>
                <div style={{ fontFamily: 'var(--font-title)', fontWeight: 850, fontSize: '17px', color: 'var(--accent-primary)', marginBottom: '8px' }}>{topThree[0].name}</div>
                <div style={{
                  background: 'linear-gradient(to top, rgba(245, 158, 11, 0.2), rgba(14, 165, 233, 0.2))',
                  border: '2px solid var(--accent-secondary)',
                  borderRadius: '12px 12px 0 0',
                  width: '100%',
                  height: '140px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-title)',
                  fontWeight: 'bold',
                  gap: '4px'
                }}>
                  <span style={{ fontSize: '20px', color: '#fff' }}>Şampiyon</span>
                  <span style={{ fontSize: '12px', color: 'var(--accent-secondary)' }}>{topThree[0].points} ELO</span>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {topThree[2] && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '150px' }}>
                <div style={{ fontSize: '32px' }}>🥉</div>
                <div style={{ fontFamily: 'var(--font-title)', fontWeight: 600, fontSize: '15px', marginBottom: '8px' }}>{topThree[2].name}</div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '8px 8px 0 0',
                  width: '100%',
                  height: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-title)',
                  fontWeight: 'bold',
                  color: 'var(--text-secondary)'
                }}>
                  {topThree[2].points} ELO
                </div>
              </div>
            )}
          </div>
        )}
      </section>

    </div>
  );
}
