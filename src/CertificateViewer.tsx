import { useEffect, useState } from 'react';
import { BadgeCheck, X } from 'lucide-react';

const certificatePath = '/resources/certificate-of-appreciation.jpeg';
const certificateAlt = 'Certificate of Appreciation supplied for Global Market Options Company. It displays company number 00258922 and the Gotthardstrasse 26, 6300 Zug, Switzerland address. The document has not been independently verified.';

export function CertificateViewer() {
  const [open, setOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  return (
    <>
      <div className='certificate-showcase' id='certificate'>
        <div className='certificate-image-frame'>
          {imageFailed ? (
            <div className='certificate-placeholder certificate-image-placeholder' role='img' aria-label='Certificate image placeholder'>
              <BadgeCheck size={30}/>
              <b>Certificate image placeholder</b>
              <span>The certificate image will appear here once its upload is available.</span>
            </div>
          ) : (
            <img
              className='certificate-image'
              src={certificatePath}
              alt={certificateAlt}
              loading='lazy'
              onError={() => setImageFailed(true)}
            />
          )}
        </div>
        <div className='certificate-caption'>
          <span className='security-index'>SUPPLIED DOCUMENT · NOT INDEPENDENTLY VERIFIED</span>
          <h3>Certificate of Appreciation</h3>
          <p>Company details provided for publication: Global Market Options Company, number 00258922, Gotthardstrasse 26, 6300 Zug, Switzerland. Founded: 07 February 2005.</p>
          <p className='certificate-caveat'>The attached document is titled Certificate of Appreciation. It is not represented as proof of registration, financial-services authorisation, licensing, regulatory approval, or independent endorsement.</p>
          <button className='certificate-view-button' type='button' onClick={() => setOpen(true)} disabled={imageFailed}>
            View Full Certificate
          </button>
        </div>
      </div>
      {open && (
        <div className='certificate-lightbox' role='presentation' onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section className='certificate-lightbox-panel' role='dialog' aria-modal='true' aria-labelledby='certificate-lightbox-title'>
            <div className='certificate-lightbox-heading'>
              <h2 id='certificate-lightbox-title'>Certificate of Appreciation</h2>
              <button type='button' aria-label='Close full-size certificate' onClick={() => setOpen(false)}><X size={20}/></button>
            </div>
            <img src={certificatePath} alt={certificateAlt}/>
          </section>
        </div>
      )}
    </>
  );
}
