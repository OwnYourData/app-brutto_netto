class CreateStatistics < ActiveRecord::Migration[5.2]
  def change
    create_table :statistics do |t|
      t.integer :timestamp
      t.string :url
      t.string :target
      t.string :session_id

      t.timestamps
    end
  end
end
