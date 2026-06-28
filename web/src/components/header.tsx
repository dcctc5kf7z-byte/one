export function Header() {
  return (
    <header className="text-center pt-12 pb-6 px-4 select-none">
      <h1 className="text-[18px] font-semibold text-foreground mb-2 tracking-wide">
        写作诊断工具
      </h1>
      <p className="text-[13px] text-muted-foreground max-w-xs mx-auto leading-relaxed">
        贴一段文字，看看它把你带去哪。
      </p>
    </header>
  );
}
