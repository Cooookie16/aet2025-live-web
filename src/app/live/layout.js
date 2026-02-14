import { Open_Sans } from 'next/font/google';

const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['500', '800'],
  display: 'swap',
});

export default function LiveLayout({ children }) {
  return (
    <div className={`${openSans.className} font-medium`}>
      {children}
    </div>
  );
}
