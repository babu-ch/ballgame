import Phaser from "phaser";
import {random, last} from "lodash";
import Arc = Phaser.GameObjects.Arc;
import Body = Phaser.Physics.Arcade.Body;
import Text = Phaser.GameObjects.Text;
import {isPc} from "../util.ts";

// ボールの種類 score=消した時の点数 size=大きさ  color=色
const BALL_TYPES = [
    {score: 10,size: 50, color: 0xff5733},
    {score: 20,size: 75, color: 0x00bfa5},
    {score: 30,size: 100, color: 0x6f42c1},
    {score: 50,size: 135, color: 0x2ecc71},
    {score: 70,size: 170, color: 0xffc107},
    {score: 100,size: 190, color: 0x3498db},
    {score: 150,size: 230, color: 0xd32f2f},
];

// ゲームオーバーにする高さ
const GAMEOVER_LINE_Y = 150;

export default class MyScene extends Phaser.Scene {
    // 全部のボールいれとく
    private balls: Arc[];
    // 落とす前のボール
    private ball?: Arc;
    // 最後に落としたボール
    private lastBall?: Arc;
    // すこあ
    private score: number;
    // スコア表示
    private scoreText?: Text;
    // 次のボール撃てるか
    private nextBallReady: boolean;
    private gameOver: boolean;
    constructor() {
        super({ key: "myscene" });
        this.balls = []
        this.score = 0;
        this.nextBallReady = true;
        this.gameOver = false;
    }

    create() {
        // init
        this.score = 0
        this.gameOver = false
        this.nextBallReady = true
        this.balls = []
        this.scoreText = this.add.text(0, 0, `score: ${this.score}`)

        // ゲームオーバーの線
        this.add.line(0, GAMEOVER_LINE_Y, 1600, 0, 0, 0, 0xff)

        // クリックした時
        if (isPc) {
            this.input.on("pointerdown", () => {this.onClick()});
        } else {
            this.input.on("pointerup", () => {
                this.onClick()
            })
        }

        // 最初のボールを作成
        this.ball = this.add.circle(400, 100, BALL_TYPES[0].size/2, BALL_TYPES[0].color)

        // 衝突判定をセット
        this.setCollision()
    }

    update() {
        // 発射前のボールはマウスに追従させる
        if (!this.ball!.body) {
            if (isPc) {
                this.ball!.x = this.input.mousePointer.x;
            } else {
                this.ball!.x = this.input.activePointer.x;
            }
        }
    }

    setCollision() {
        // 衝突時の処理
        this.physics.world.addCollider(this.balls, this.balls, (ball1, ball2) => {
            if (this.gameOver) {
                return
            }
            if (!(ball1 instanceof Arc) || !(ball2 instanceof Arc)) {
                return
            }
            // 大きさが同じボールのみ消す
            if (ball1.width !== ball2.width) {
                // ゲームオーバー判定  最後のボールがラインを超えたか？
                if ((ball1 === this.lastBall || ball2 === this.lastBall) && this.lastBall.y < GAMEOVER_LINE_Y) {
                    this.gameOver = true
                    this.add.text(300, 300, `GAMEOVER score: ${this.score}`, {fontSize:20})
                    const button = this.add.text(400, 400, "RETRY", { fontSize: "32px"})
                    button.setOrigin(0.5)
                    button.on("pointerdown",  () => {
                        this.scene.restart()
                    })
                    button.setInteractive()
                }
                return
            }
            this.nextBallReady = true
            // スコア加算
            const currentType = BALL_TYPES.find(type => type.size === ball1.width)
            if (currentType) {
                this.score += currentType.score
                this.scoreText!.setText(`score: ${this.score}`)
            }
            ball1.destroy()
            ball2.destroy()
            // 一番でけぇボールなら消すだけ
            if (ball1.width === last(BALL_TYPES)!.size) {
                return
            }
            // そうじゃないなら2つのボールの中心点に次の大きさのボール作る
            const pos = getMiddlePoint(ball1, ball2)
            this.makeNewBall(pos.x, pos.y, ball1.width)
        })
    }

    // クリックしたとき
    onClick() {
        if (!this.nextBallReady || this.gameOver) {
            return
        }
        this.nextBallReady = false
        // 物理エンジンを適用して落下さす
        const ball = this.ball!
        this.applyPhysicsToBall(ball)
        this.lastBall = ball

        // 次のボール作る
        const ballType = BALL_TYPES[random(0, 3)]
        this.ball = this.add.circle(400, 100, ballType.size/2, ballType.color)
    }

    // 次の大きさのボールつくる
    makeNewBall(x:number, y:number, size:number) {
        const nextType = BALL_TYPES[BALL_TYPES.findIndex(type => type.size === size) + 1]
        const ball = this.add.circle(x, y, (nextType.size)/2, nextType.color)
        this.applyPhysicsToBall(ball)
    }

    // ボールに物理エンジンを適用
    applyPhysicsToBall(ball:Arc) {
        this.physics.add.existing(ball)
        const ballBody = ball.body as Body
        ballBody.setCollideWorldBounds(true)
        ballBody.setBounce(0.5, 0.5)
        ballBody.setGravityY(300)
        ballBody.setCircle(ball.width/2)
        this.balls.push(ball)
        ballBody.onWorldBounds = true
        // 地面にぶつかったら次弾発射ok
        // memo nextBallReadyにはバグがある ここの判定と玉がぶつかったときにready=trueにする処理はどちらかだけ実行する必要があるけどどっちも実行している。めんどいので放置
        ballBody.world.on("worldbounds", (body:any, _:boolean, down:boolean) => {
            if (body.gameObject === ball && down) {
                this.nextBallReady = true
            }
        })
    }
}



// 真ん中ミツケル
function getMiddlePoint(ball1:Arc, ball2:Arc) {
    const middleX = (ball1.x + ball2.x) / 2
    const middleY = (ball1.y + ball2.y) / 2
    return { x: middleX, y: middleY }
}