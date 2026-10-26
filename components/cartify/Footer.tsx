export function Footer() {
  return (
    <footer className="cartify-footer" id="support">
      <div className="cartify-footer__grid">
        <div>
          <h2>Cartify</h2>
          <p>Fast marketplace shopping for fashion, beauty, home, tech and daily essentials.</p>
        </div>
        <div>
          <h3>Customer service</h3>
          <a href="#help">Help center</a>
          <a href="#support">Support</a>
          <a href="#orders">Track order</a>
        </div>
        <div>
          <h3>About us</h3>
          <a href="#about">Cartify story</a>
          <a href="#careers">Careers</a>
          <a href="#privacy">Privacy policy</a>
        </div>
        <div>
          <h3>Payment methods</h3>
          <p>Cards, bank transfer, EasyPaisa, JazzCash and cash on delivery.</p>
          <h3>Shipping and returns</h3>
          <a href="#shipping">Delivery options</a>
          <a href="#returns">Returns policy</a>
        </div>
        <div>
          <h3>Social</h3>
          <div className="cartify-socials">
            <a href="#instagram" aria-label="Instagram">IG</a>
            <a href="#facebook" aria-label="Facebook">FB</a>
            <a href="#twitter" aria-label="Twitter">X</a>
          </div>
          <label>
            <span>Language / currency</span>
            <select aria-label="Language and currency">
              <option>English / PKR</option>
            </select>
          </label>
        </div>
      </div>
    </footer>
  );
}
