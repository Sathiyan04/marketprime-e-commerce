export function Footer() {
  return (
    <footer className="mt-20 border-t bg-surface-elevated">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-accent">
              <span className="font-display text-sm font-bold text-accent-foreground">M</span>
            </div>
            <span className="font-display font-semibold">MarketPrime</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Curated essentials, delivered fast. Premium products at honest prices.
          </p>
        </div>
        <FooterCol title="Shop" links={["Electronics", "Fashion", "Home & Living", "Books"]} />
        <FooterCol title="Help" links={["Track order", "Returns", "Shipping", "Contact us"]} />
        <FooterCol title="Company" links={["About", "Careers", "Press", "Privacy"]} />
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-5 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} MarketPrime. All rights reserved.</p>
          <p>Built with care.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l}>
            <a className="text-sm text-muted-foreground transition-base hover:text-foreground" href="#">
              {l}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
