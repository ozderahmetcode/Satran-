import React, { useState } from 'react';

export default function FAQ({ setCurrentPage }) {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    { q: "Biz kimiz ve etkinliklerimiz nedir?", a: "ozder, satranç oynamayı ve yeni insanlarla tanışmayı sevenleri bir araya getiren sosyal bir topluluktur. Düzenli olarak kafelerde, barlarda veya parklarda satranç buluşmaları düzenliyoruz." },
    { q: "Etkinliklere nasıl katılabilirim?", a: "Web sitemiz üzerinden 'Etkinlikler' sayfasına gidip, yaklaşan bir etkinliğe 'Tek Tıkla Katıl' butonu ile kaydınızı oluşturabilirsiniz." },
    { q: "Etkinlik ücretleri nasıl belirleniyor?", a: "Etkinlik mekanına ve ikramlara göre değişkenlik göstermektedir. Etkinlik detay sayfasında katılım ücretini görebilirsiniz." },
    { q: "Hangi yaş grupları katılabilir?", a: "Etkinliklerimiz genel olarak 16 yaş üzeri katılımcılara yöneliktir. Bazı özel etkinliklerimizde yaş sınırlamaları olabilir, bu durum etkinlik açıklamasında belirtilir. Gençlerden yetişkinlere kadar geniş bir katılımcı kitlemiz bulunuyor." },
    { q: "Hiç deneyimim yok, katılabilir miyim?", a: "Kesinlikle! Her seviyeden oyuncuya açığız. Sadece öğrenmek ve izlemek için bile katılabilirsiniz." },
    { q: "Etkinlikler nerede düzenleniyor?", a: "Çoğunlukla İstanbul içinde, Ümraniye, Kadıköy, Beşiktaş gibi lokasyonlardaki partner kafelerimizde düzenlenmektedir." },
    { q: "Bir şey getirmeli miyim?", a: "Eğer kendi satranç takımınız varsa getirmeniz harika olur, ancak biz de etkinlik alanında yeterli sayıda satranç takımı bulunduruyoruz." },
    { q: "Topluluk kuralları nelerdir?", a: "Saygı, centilmenlik ve eğlence odaklı bir ortam yaratmayı hedefliyoruz. Dinamiklerimize zarar verecek davranışlardan kaçınılması esastır." },
  ];

  const toggleAccordion = (index) => {
    if (openIndex === index) {
      setOpenIndex(null);
    } else {
      setOpenIndex(index);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '40px 0', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px' }}>
      
      <section style={{ textAlign: 'center' }}>
        <span style={{ display: 'inline-block', background: 'rgba(217,119,6,0.1)', color: 'var(--accent-secondary)', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, marginBottom: '16px' }}>
          ? SSS
        </span>
        <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '42px', fontWeight: 800, marginBottom: '12px' }}>
          Merak Edilenler
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          ozder hakkında aklınıza takılan sorulara yanıt bulun
        </p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
          <h4 style={{ fontFamily: 'var(--font-title)', fontWeight: 700, marginBottom: '8px' }}>Sosyal Oyun Topluluğu</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Oyun tutkunlarının bir araya geldiği samimi ve güvenli ortam</p>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📅</div>
          <h4 style={{ fontFamily: 'var(--font-title)', fontWeight: 700, marginBottom: '8px' }}>Düzenli Etkinlikler</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Haftalık satranç turnuvaları, masa oyunu geceleri ve özel etkinlikler</p>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏆</div>
          <h4 style={{ fontFamily: 'var(--font-title)', fontWeight: 700, marginBottom: '8px' }}>Ödüllü Turnuvalar</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Her seviyeden oyuncu için ödüllü turnuvalar ve başarı rozetleri</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {faqs.map((faq, index) => (
          <div 
            key={index} 
            className="glass-panel" 
            style={{ 
              padding: '20px 24px', 
              cursor: 'pointer', 
              border: openIndex === index ? '1px solid var(--accent-primary)' : '1px solid var(--panel-border)',
              transition: 'all 0.3s ease'
            }}
            onClick={() => toggleAccordion(index)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontFamily: 'var(--font-title)', fontWeight: 600, fontSize: '16px' }}>{faq.q}</h4>
              <span style={{ fontSize: '20px', color: openIndex === index ? 'var(--accent-primary)' : 'var(--text-secondary)', transform: openIndex === index ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s ease' }}>
                ▾
              </span>
            </div>
            {openIndex === index && (
              <div style={{ marginTop: '16px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7, borderTop: '1px solid var(--panel-border)', paddingTop: '16px' }}>
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
        <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>Sorunuz yanıtlanmadı mı?</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px auto' }}>
          Merak ettiğiniz her şeyi bize sorabilir, etkinliklerimiz hakkında detaylı bilgi alabilirsiniz.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <button onClick={() => setCurrentPage('event')} className="btn-primary" style={{ background: '#d1fae5', color: '#065f46' }}>
            📅 Etkinlikleri İncele
          </button>
          <button onClick={() => setCurrentPage('contact')} className="btn-secondary">
            ✉ İletişim
          </button>
        </div>
      </div>
    </div>
  );
}
