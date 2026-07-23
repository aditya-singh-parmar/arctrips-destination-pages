export function EmailCapture() {
  return (
    <section className="container section">
      <div className="capture">
        <h2 className="capture__title t-h3">Get early access to verified homes and special offers.</h2>
        <form className="capture__form" action="#">
          <input className="capture__input" type="email" placeholder="Enter your email address" aria-label="Email address" />
          <button className="btn btn--primary" type="submit">Sign up</button>
        </form>
      </div>
    </section>
  );
}
