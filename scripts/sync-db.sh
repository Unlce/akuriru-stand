#!/bin/bash
# データベースマイグレーションスクリプト
# 本番環境 → 開発環境へのデータ同期

set -e

echo "🔄 データベース同期スクリプト"
echo "本番環境 (Lolipop) → ローカル開発環境"
echo ""

# =====================================================
# 設定
# =====================================================

# ソース（本番環境）
SRC_HOST="${LOLIPOP_DB_HOST:-mysql324.phy.lolipop.lan}"
SRC_DB="${LOLIPOP_DB_NAME:-LAA1658426-stand}"
SRC_USER="${LOLIPOP_DB_USER:-LAA1658426}"
SRC_PASS="${LOLIPOP_DB_PASS}"

# ターゲット（ローカル環境）
DEST_HOST="${DB_HOST:-mysql}"
DEST_DB="${DB_NAME:-acrylic_stand}"
DEST_USER="${DB_USER:-stand_user}"
DEST_PASS="${DB_PASS:-stand_password}"

# 一時ファイル
TEMP_FILE="./database/backups/sync_temp_$(date +%Y%m%d_%H%M%S).sql"

# =====================================================
# 関数
# =====================================================

show_help() {
    cat << EOF
使用方法: $0 [オプション]

本番環境のデータをローカル開発環境に同期します。

オプション:
    -h, --help          このヘルプを表示
    --dry-run           実際には同期せず、確認のみ
    --skip-uploads      uploads/ ディレクトリの同期をスキップ
    --data-only         テーブル構造は同期せず、データのみ

環境変数（ソース）:
    LOLIPOP_DB_HOST     Lolipop データベースホスト
    LOLIPOP_DB_NAME     Lolipop データベース名
    LOLIPOP_DB_USER     Lolipop ユーザー名
    LOLIPOP_DB_PASS     Lolipop パスワード

環境変数（ターゲット）:
    DB_HOST             ローカル データベースホスト
    DB_NAME             ローカル データベース名
    DB_USER             ローカル ユーザー名
    DB_PASS             ローカル パスワード
EOF
}

# 確認プロンプト
confirm_sync() {
    echo "⚠️  警告: ローカル環境のデータは上書きされます！"
    echo ""
    echo "ソース (本番):"
    echo "   ホスト: $SRC_HOST"
    echo "   データベース: $SRC_DB"
    echo ""
    echo "ターゲット (ローカル):"
    echo "   ホスト: $DEST_HOST"
    echo "   データベース: $DEST_DB"
    echo ""
    
    read -p "続行しますか？ (yes/no): " answer
    
    if [ "$answer" != "yes" ]; then
        echo "❌ 同期をキャンセルしました"
        exit 0
    fi
}

# データベースダンプ
dump_source() {
    echo "📥 本番環境からデータをダンプ中..."
    
    mysqldump \
        --host="$SRC_HOST" \
        --user="$SRC_USER" \
        --password="$SRC_PASS" \
        --single-transaction \
        --quick \
        --lock-tables=false \
        --routines \
        --triggers \
        --events \
        --no-tablespaces \
        "$SRC_DB" > "$TEMP_FILE"
    
    echo "✅ ダンプ完了: $(du -h "$TEMP_FILE" | cut -f1)"
}

# データベースリストア
restore_dest() {
    echo "📤 ローカル環境へリストア中..."
    
    # Docker環境の場合
    if docker ps | grep -q "acrylic-stand-mysql"; then
        echo "   Docker環境を検出"
        docker exec -i acrylic-stand-mysql mysql \
            -u"$DEST_USER" \
            -p"$DEST_PASS" \
            "$DEST_DB" < "$TEMP_FILE"
    else
        # 通常のMySQL接続
        mysql \
            --host="$DEST_HOST" \
            --user="$DEST_USER" \
            --password="$DEST_PASS" \
            "$DEST_DB" < "$TEMP_FILE"
    fi
    
    echo "✅ リストア完了"
}

# 個人情報の匿名化（オプション）
anonymize_data() {
    echo "🔒 個人情報を匿名化中..."
    
    local sql="
        UPDATE customers 
        SET 
            email = CONCAT('test', id, '@example.com'),
            phone = CONCAT('090-0000-', LPAD(id, 4, '0')),
            address = CONCAT('東京都テスト区テスト町', id, '-1-1');
    "
    
    if docker ps | grep -q "acrylic-stand-mysql"; then
        docker exec -i acrylic-stand-mysql mysql \
            -u"$DEST_USER" \
            -p"$DEST_PASS" \
            "$DEST_DB" \
            -e "$sql"
    else
        mysql \
            --host="$DEST_HOST" \
            --user="$DEST_USER" \
            --password="$DEST_PASS" \
            "$DEST_DB" \
            -e "$sql"
    fi
    
    echo "✅ 匿名化完了"
}

# アップロードファイルの同期（FTP経由）
sync_uploads() {
    echo "📁 アップロードファイルを同期中..."
    
    # TODO: Lolipop FTP情報が必要
    # lftp などを使用してファイル同期
    
    echo "⚠️  ファイル同期は手動で実行してください"
    echo "   Lolipop FTP: ftp.lolipop.jp"
    echo "   ディレクトリ: /uploads/"
}

# クリーンアップ
cleanup() {
    if [ -f "$TEMP_FILE" ]; then
        echo "🧹 一時ファイルを削除"
        rm -f "$TEMP_FILE"
    fi
}

# =====================================================
# メイン処理
# =====================================================

# 引数解析
DRY_RUN="no"
SKIP_UPLOADS="no"
DATA_ONLY="no"
ANONYMIZE="yes"  # デフォルトで匿名化

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --dry-run)
            DRY_RUN="yes"
            shift
            ;;
        --skip-uploads)
            SKIP_UPLOADS="yes"
            shift
            ;;
        --data-only)
            DATA_ONLY="yes"
            shift
            ;;
        --no-anonymize)
            ANONYMIZE="no"
            shift
            ;;
        *)
            echo "❌ 不明なオプション: $1"
            show_help
            exit 1
            ;;
    esac
done

# パスワードチェック
if [ -z "$SRC_PASS" ]; then
    echo "❌ エラー: 本番環境のパスワードが設定されていません"
    echo "   環境変数 LOLIPOP_DB_PASS を設定してください"
    exit 1
fi

# バックアップディレクトリ作成
mkdir -p ./database/backups

# 確認プロンプト
if [ "$DRY_RUN" != "yes" ]; then
    confirm_sync
fi

# ドライランの場合
if [ "$DRY_RUN" = "yes" ]; then
    echo "🔍 ドライランモード: 実際の同期は行いません"
    echo ""
    echo "実行される処理:"
    echo "  1. 本番環境からダンプ: $SRC_HOST/$SRC_DB"
    echo "  2. ローカル環境へリストア: $DEST_HOST/$DEST_DB"
    [ "$ANONYMIZE" = "yes" ] && echo "  3. 個人情報の匿名化"
    [ "$SKIP_UPLOADS" != "yes" ] && echo "  4. アップロードファイルの同期"
    exit 0
fi

# トラップ設定（エラー時のクリーンアップ）
trap cleanup EXIT

# 同期実行
echo "🚀 同期開始: $(date)"
echo ""

dump_source
restore_dest

if [ "$ANONYMIZE" = "yes" ]; then
    anonymize_data
fi

if [ "$SKIP_UPLOADS" != "yes" ]; then
    sync_uploads
fi

echo ""
echo "🎉 同期が完了しました！"
echo "完了時刻: $(date)"
echo ""
echo "次のステップ:"
echo "  1. ローカル環境でアプリケーションを起動"
echo "  2. データが正しく同期されているか確認"
echo "  3. 必要に応じて画像ファイルを手動で同期"
