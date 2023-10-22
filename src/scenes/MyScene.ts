import Phaser from "phaser";
import {random, last} from "lodash";
import Arc = Phaser.GameObjects.Arc;
import Body = Phaser.Physics.Arcade.Body;
import Text = Phaser.GameObjects.Text;

const BALL_TYPES = [
    {score: 10,size: 50, color: 0xff5733},
    {score: 20,size: 75, color: 0x00bfa5},
    {score: 30,size: 100, color: 0x6f42c1},
    {score: 50,size: 135, color: 0x2ecc71},
    {score: 70,size: 170, color: 0xffc107},
    {score: 100,size: 190, color: 0x3498db},
    {score: 150,size: 230, color: 0xd32f2f},
];

const GAMEOVER_LINE_Y = 150;

export default class MyScene extends Phaser.Scene {
    private balls: Arc[];
    private ball?: Arc;
    private lastBall?: Arc;
    private score: number;
    private scoreText?: Text;
    private nextBallReady: boolean;
    private gameOver: boolean;
    constructor() {
        super({ key: "myscene" });
        this.balls = []
        this.score = 0;
        this.nextBallReady = true;
        this.gameOver = false;
    }

    preload() {
    }

    create() {
        this.score = 0
        this.gameOver = false
        this.nextBallReady = true
        this.scoreText = this.add.text(0, 0, `score: ${this.score}`)

        this.add.line(0, GAMEOVER_LINE_Y, 1600, 0, 0, 0, 0xff)

        this.input.on("pointerdown", () => {this.onClick()})

        // 最初のボールを作成
        this.ball = this.add.circle(400, 100, BALL_TYPES[0].size/2, BALL_TYPES[0].color)

        this.setCollision()
    }

    update() {
        if (!this.ball!.body) {
            this.ball!.x = this.input.mousePointer.x
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
            if ((ball1 === this.lastBall || ball2 === this.lastBall) && this.lastBall.y < GAMEOVER_LINE_Y) {
                this.gameOver = true
                this.add.text(300, 300, `GAMEOVER score: ${this.score}`, {fontSize:20})
                const button = this.add.text(400, 400, "RETRY", { fontSize: "32px"})
                button.setOrigin(0.5)
                button.on("pointerdown",  () => {
                    this.scene.restart()
                })
                button.setInteractive()
                return
            }
            this.nextBallReady = true
            if (ball1.width !== ball2.width) {
                return
            }
            const currentType = BALL_TYPES.find(type => type.size === ball1.width)
            if (currentType) {
                this.score += currentType.score
                this.scoreText!.setText(`score: ${this.score}`)
            }
            if (ball1.width === last(BALL_TYPES)!.size) {
                ball1.destroy()
                ball2.destroy()
                return
            }
            ball1.destroy()
            ball2.destroy()
            const pos = getMiddlePoint(ball1, ball2)
            this.makeNewBall(pos.x, pos.y, ball1.width)
        })
    }

    onClick() {
        if (!this.nextBallReady || this.gameOver) {
            return
        }
        this.nextBallReady = false
        const ball = this.ball!
        this.applyPhysicsToBall(ball)
        this.lastBall = ball

        // 次のボール作る
        const ballType = BALL_TYPES[random(0, 3)]
        this.ball = this.add.circle(400, 100, ballType.size/2, ballType.color)
    }

    makeNewBall(x:number, y:number, size:number) {
        const nextType = BALL_TYPES[BALL_TYPES.findIndex(type => type.size === size) + 1]
        const ball = this.add.circle(x, y, (nextType.size)/2, nextType.color)
        this.applyPhysicsToBall(ball)
    }

    applyPhysicsToBall(ball:Arc) {
        // ボールに物理エンジンを適用
        this.physics.add.existing(ball)
        const ballBody = ball.body as Body
        ballBody.setCollideWorldBounds(true)
        ballBody.setBounce(0.5, 0.5)
        ballBody.setGravityY(300)
        ballBody.setCircle(ball.width/2)
        this.balls.push(ball)
        ballBody.onWorldBounds = true
        ballBody.world.on("worldbounds", (body:any, _:boolean, down:boolean) => {
            if (body.gameObject === ball && down) {
                this.nextBallReady = true
            }
        })
    }
}



function getMiddlePoint(ball1:Arc, ball2:Arc) {
    const middleX = (ball1.x + ball2.x) / 2
    const middleY = (ball1.y + ball2.y) / 2
    return { x: middleX, y: middleY }
}