import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: '/dashboard/admin',
    permanent: false,
  },
});

export default function AdminRedirect() {
  return null;
}
