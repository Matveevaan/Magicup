import styles from "./videocontent.module.scss";
// import videoSrc from "../../public/videos/"


export default function VideoContent() {
return(
    <section className={styles.main}>
        <video src='/makeCoffee2.mp4' autoPlay muted loop className={styles.video}  />
    </section>
)
}
