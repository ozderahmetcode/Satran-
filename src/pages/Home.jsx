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
          marginBottom: '20px',
          color: 'var(--text-primary)'
        }}>
          Sosyal Satranç Kültürü <br />
          Şimdi <span className="text-gradient">OZDER</span> ile Buluşuyor
        </h1>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '18px',
          maxWidth: '650px',
          margin: '0 auto 40px auto'
        }}>
          Ümraniye X Cafe'de düzenlenen, satrancın heyecanını kahve kokusu ve samimi sohbetlerle birleştiren özgün etkinliklerimize katılın.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button onClick={() => setCurrentPage('event')} className="btn-primary" style={{ padding: '14px 28px', fontSize: '16px' }}>
            Etkinliğe Katıl ve Yerini Ayırt
          </button>
          <button onClick={() => setCurrentPage('database')} className="btn-secondary" style={{ padding: '14px 28px', fontSize: '16px', background: '#fff', border: '1px solid var(--panel-border)' }}>
            Sıralamayı İncele
          </button>
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent("🏆 OZDER Satranç Buluşmalarına davetlisin! Ümraniye X Cafe'de düzenlenecek etkinliğe katılmak ve detayları incelemek için tıkla: " + window.location.origin)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 22px',
              fontSize: '15px',
              fontWeight: 700,
              background: '#25D366',
              color: '#ffffff',
              borderRadius: '8px',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)',
              transition: 'transform 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            WhatsApp'ta Paylaş
          </a>
        </div>
      </section>

      {/* Stats Section */}
      <section className="glass-panel" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '24px',
        textAlign: 'center',
        background: '#ffffff',
        border: '1px solid var(--panel-border)',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)'
      }}>
        <div>
          <h3 style={{ fontSize: '44px', fontFamily: 'var(--font-title)', fontWeight: 800, color: 'var(--accent-primary)' }}>
            {stats?.organizedTournaments ?? 0}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>Düzenlenen Turnuva & Buluşma</p>
        </div>
        <div>
          <h3 style={{ fontSize: '44px', fontFamily: 'var(--font-title)', fontWeight: 800, color: '#10b981' }}>
            {stats?.gamesPlayed ?? 0}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>Oynanan Maç</p>
        </div>
        <div>
          <h3 style={{ fontSize: '44px', fontFamily: 'var(--font-title)', fontWeight: 800, color: '#3b82f6' }}>
            {stats?.registeredUsers ?? stats?.registeredPlayers ?? 0}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>Kayıtlı Üye</p>
        </div>
        <div>
          <h3 style={{ fontSize: '44px', fontFamily: 'var(--font-title)', fontWeight: 800, color: 'var(--accent-secondary)' }}>
            {stats?.totalParticipants ?? stats?.totalRegistrations ?? 0}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>Turnuva Katılımcı Sayısı</p>
        </div>
      </section>

      {/* Highlighted Event Promo */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '40px',
        alignItems: 'center'
      }}>
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', height: '360px', position: 'relative', borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, transparent 30%, #ffffff 90%)',
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
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 800,
              textTransform: 'uppercase',
              boxShadow: '0 4px 6px -1px rgba(14, 165, 233, 0.3)'
            }}>Etkinlik Detayları</span>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '28px', fontWeight: 800, marginTop: '16px', color: 'var(--text-primary)' }}>
              X Cafe Sosyal Satranç Buluşmaları
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginTop: '6px', fontWeight: 600 }}>
              📍 Ümraniye X Cafe
            </p>
          </div>
          <div style={{
            width: '100%',
            height: '100%',
            background: 'radial-gradient(circle, var(--accent-secondary) 0%, #f1f5f9 100%)',
            opacity: 0.1,
            position: 'absolute'
          }} />
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            fontSize: '180px',
            opacity: 0.1,
            userSelect: 'none',
            color: 'var(--accent-primary)',
            transform: 'translateY(-30px)'
          }}>
            👑
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Neden <span className="text-gradient">OZDER</span>'e Katılmalısın?
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: 1.7 }}>
            OZDER, sıradan bir satranç turnuvasından çok daha fazlasıdır. Burası her seviyeden insanın keyifle satranç oynayabileceği, yeni arkadaşlar edinebileceği ve kendini geliştirebileceği aktif bir sosyal topluluktur.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
            {[
              { title: "Sosyal ve Keyifli Ortam", desc: "Ümraniye X Cafe'nin sıcacık atmosferinde kahvenizi yudumlarken rekabetin keyfini çıkarın." },
              { title: "Her Seviyeye Uygun", desc: "İster başlangıç seviyesinde olun ister usta bir oyuncu, kendinize uygun rakipler bulacaksınız." },
              { title: "Resmi Olmayan Dinamik Sıralama", desc: "Oynadığınız her maç topluluk istatistiklerine yansır ve sizi liderlik panosunda üst sıralara taşır." }
            ].map((item, index) => (
              <div key={index} style={{ display: 'flex', gap: '16px', background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{
                  color: '#fff',
                  background: 'var(--accent-primary)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>✓</div>
                <div>
                  <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Champions Showcase Section */}
      <section style={{ textAlign: 'center', marginTop: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '36px', fontWeight: 800, marginBottom: '16px', color: 'var(--text-primary)' }}>
          🏆 Haftanın Şampiyonları
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 48px auto', fontSize: '16px' }}>
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
                <div style={{ fontSize: '40px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>🥈</div>
                <div style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '16px', marginBottom: '12px', color: 'var(--text-primary)' }}>{topThree[1].name}</div>
                <div style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px 12px 0 0',
                  width: '100%',
                  height: '110px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-title)',
                  fontWeight: 'bold',
                  color: 'var(--text-secondary)',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  {topThree[1].points} ELO
                </div>
              </div>
            )}

            {/* 1st Place */}
            {topThree[0] && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '180px', transform: 'scale(1.05)', zIndex: 10 }}>
                <div style={{ fontSize: '48px', filter: 'drop-shadow(0 4px 6px rgba(245, 158, 11, 0.3))' }}>👑</div>
                <div style={{ fontFamily: 'var(--font-title)', fontWeight: 800, fontSize: '18px', color: 'var(--accent-secondary)', marginBottom: '12px' }}>{topThree[0].name}</div>
                <div style={{
                  background: 'linear-gradient(to top, #fffbeb, #fef3c7)',
                  border: '2px solid #fcd34d',
                  borderRadius: '16px 16px 0 0',
                  width: '100%',
                  height: '150px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-title)',
                  fontWeight: 'bold',
                  gap: '4px',
                  boxShadow: '0 -10px 15px -3px rgba(245, 158, 11, 0.1), inset 0 2px 4px rgba(255,255,255,0.5)'
                }}>
                  <span style={{ fontSize: '20px', color: '#d97706', fontWeight: 800 }}>Şampiyon</span>
                  <span style={{ fontSize: '14px', color: '#b45309', background: 'rgba(217, 119, 6, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>{topThree[0].points} ELO</span>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {topThree[2] && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '150px' }}>
                <div style={{ fontSize: '40px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>🥉</div>
                <div style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '16px', marginBottom: '12px', color: 'var(--text-primary)' }}>{topThree[2].name}</div>
                <div style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px 12px 0 0',
                  width: '100%',
                  height: '90px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-title)',
                  fontWeight: 'bold',
                  color: 'var(--text-secondary)',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
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
