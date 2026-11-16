import { usePublicContent } from "@/shared/lib/publicContent";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Building2, GraduationCap, Mail, MessageCircle, Phone, UserRound } from "lucide-react";
import { getSupportInfo } from "../shared/api/support";
import { PublicPageBanner } from "../shared/ui/PublicPageBanner";
import "./public-auth.css";

export function ContactPage() {
  const info = useQuery({ queryKey: ["support", "info"], queryFn: getSupportInfo });
  const { content } = usePublicContent();
  const data = { ...info.data, email: content.email ?? info.data?.email, phone: content.phone ?? info.data?.phone, operatorName: content.operatorName ?? info.data?.operatorName, workingHours: content.workingHours ?? info.data?.workingHours };
  const hasContacts = Boolean(data?.email || data?.phone || data?.operatorName);
  return <div className="introduction-page public-auth-page public-interior-page">
    <main className="public-contact-main">
      <PublicPageBanner title={content.contactTitle} description={content.contactDescription} />
      <div className="public-contact-grid"><section className="public-contact-channels" aria-labelledby="contact-channels-title"><h2 id="contact-channels-title">Kênh liên hệ</h2>
      {info.isPending && <p className="public-contact-status" role="status">Đang tải thông tin liên hệ...</p>}
      {info.isError && <p className="public-contact-status" role="alert">Chưa tải được thông tin liên hệ. <button type="button" className="underline" onClick={() => void info.refetch()}>Thử lại</button></p>}
      {data && !hasContacts && <p className="public-contact-status">Thông tin liên hệ đang được cập nhật.</p>}
      {hasContacts && <div className="public-contact-details">
        {data?.email && <div className="public-contact-row"><Mail size={24} /><div><h3>Email hỗ trợ</h3><a href={`mailto:${data.email}`}>{data.email}</a></div></div>}
        {data?.phone && <div className="public-contact-row"><Phone size={24} /><div><h3>Điện thoại</h3><a href={`tel:${data.phone.replace(/[^+\d]/g, "")}`}>{data.phone}</a></div></div>}
        {data?.operatorName && <div className="public-contact-row"><Building2 size={24} /><div><h3>Đơn vị vận hành</h3><p>{data.operatorName}</p></div></div>}
      </div>}
      {data?.workingHours && <p className="public-contact-hours">Thời gian hỗ trợ: {data.workingHours}</p>}
      </section><aside className="public-contact-assistance"><MessageCircle size={30} aria-hidden="true" /><h2>Cần hỗ trợ học tập?</h2><p>Đăng nhập để gửi và theo dõi yêu cầu trong mục Hỗ trợ học viên.</p><ul><li><UserRound size={17} />Tài khoản và đăng nhập</li><li><BookOpen size={17} />Nội dung và tiến độ học tập</li><li><GraduationCap size={17} />Bài kiểm tra và kết quả học tập</li></ul><Link className="intro-primary" to="/login">Đăng nhập để gửi yêu cầu<ArrowRight size={17} /></Link></aside></div>
    </main>
  </div>;
}
